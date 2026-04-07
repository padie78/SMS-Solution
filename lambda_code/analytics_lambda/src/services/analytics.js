/**
 * @fileoverview Service Layer - Lógica de Negocio de Analíticas.
 * Se encarga de la orquestación entre el repositorio y el formato requerido por la UI de Angular.
 * Realiza conversiones de tipos (DynamoDB Map/Number a Native JS) y lógica de filtrado post-query.
 */

import { repo } from '../repository/dynamo.js';

export const analyticsService = {
    
    /**
     * Obtiene un resumen ejecutivo (KPIs) para los indicadores superiores del Dashboard.
     * @param {string} orgId - ID de la organización (obtenido de forma segura vía JWT).
     * @param {string} year - Año de ejercicio (ej: "2026").
     * @returns {Promise<Object>} Totales de CO2e, gasto, conteo y desglose por rubro.
     */
    getYearlyKPI: async (orgId, year) => {
        const stats = await repo.getStats(orgId, year);
        
        // Manejo de estado vacío para evitar errores en el Frontend
        if (!stats) return { message: "Sin datos consolidados para este periodo", data: null };

        return {
            totalCo2e: parseFloat(stats.total_co2e_kg?.N || 0),
            totalSpend: parseFloat(stats.total_spend?.N || 0),
            invoiceCount: parseInt(stats.invoice_count?.N || 0),
            lastFile: stats.last_file_processed?.S || "Ninguno",
            // Desglose por servicio para gráficos de torta (Pie Charts)
            byService: {
                ELEC: parseFloat(stats.service_ELEC_co2e?.N || 0),
                GAS: parseFloat(stats.service_GAS_co2e?.N || 0)
            }
        };
    },

   /**
     * Obtiene KPIs específicos de un mes y calcula la variación vs el mes anterior.
     * @param {string} orgId - ID de la organización.
     * @param {string} year - Año de consulta.
     * @param {string} month - Mes en formato "01", "02", etc.
     */
    getMonthlyKPI: async (orgId, year, month) => {
        const stats = await repo.getStats(orgId, year);
        if (!stats) return { message: "No hay datos para este periodo", data: null };

        const currentM = month.toString().padStart(2, '0');
        
        // 1. Datos del Mes Actual
        const currentCo2 = parseFloat(stats[`month_${currentM}_co2e`]?.N || 0);
        const currentSpend = parseFloat(stats[`month_${currentM}_spend`]?.N || 0);

        // 2. Lógica para el Mes Anterior (MoM)
        const monthInt = parseInt(currentM);
        const prevMonthStr = (monthInt - 1).toString().padStart(2, '0');
        
        // Si es Enero (01), el mes anterior sería 00 (no existe en este registro anual)
        const prevCo2 = monthInt > 1 ? parseFloat(stats[`month_${prevMonthStr}_co2e`]?.N || 0) : 0;
        const prevSpend = monthInt > 1 ? parseFloat(stats[`month_${prevMonthStr}_spend`]?.N || 0) : 0;

        // 3. Cálculo de variaciones porcentuales
        const calculateDiff = (current, previous) => {
            if (previous === 0) return current > 0 ? 100 : 0; // Evitamos división por cero
            return ((current - previous) / previous) * 100;
        };

        return {
            month: currentM,
            year: year,
            kpis: {
                emissions: {
                    value: currentCo2,
                    previousValue: prevCo2,
                    diffPercentage: parseFloat(calculateDiff(currentCo2, prevCo2).toFixed(2))
                },
                spend: {
                    value: currentSpend,
                    previousValue: prevSpend,
                    diffPercentage: parseFloat(calculateDiff(currentSpend, prevSpend).toFixed(2))
                }
            },
            // Metadata útil para la UI (ej: mostrar flechas verdes/rojas)
            status: {
                isEmissionsUp: currentCo2 > prevCo2,
                isSpendUp: currentSpend > prevSpend
            }
        };
    },

    /**
     * Calcula la evolución mensual de emisiones y gastos para gráficos de series temporales.
     * @param {string} orgId - ID de la organización.
     * @param {string} year - Año de consulta.
     * @param {string} [gasType='co2e'] - Gas específico a graficar: 'co2', 'ch4', 'n2o' o 'co2e'.
     * @returns {Promise<Array<Object>>} Dataset formateado para ECharts (label, emissions, spend).
     */
    getEvolution: async (orgId, year, gasType = 'co2e') => {
        const stats = await repo.getYearlyStats(orgId, year);
        if (!stats) return [];

        const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
        
        return months.map(m => {
            // Acceso dinámico a atributos de DynamoDB (ej: month_01_co2e)
            const emissionValue = stats[`month_${m}_${gasType}`]?.N || 0;
            const spendValue = stats[`month_${m}_spend`]?.N || 0;

            return {
                label: `Mes ${m}`,
                emissions: parseFloat(emissionValue),
                spend: parseFloat(spendValue)
            };
        }).filter(d => d.emissions > 0 || d.spend > 0); // Filtramos meses sin actividad para limpiar el gráfico
    },

    /**
     * Ejecuta una búsqueda avanzada con filtros granulares sobre las facturas.
     * @param {string} orgId - ID de la organización.
     * @param {Object} filters - Criterios de búsqueda provenientes de los QueryParams.
     * @returns {Promise<Array<Object>>} Facturas mapeadas para la tabla principal.
     */
    searchInvoices: async (orgId, filters) => {
        const invoices = await repo.searchInvoices(orgId, filters);
        
        // El gasType define qué campo del objeto climatiq_result vamos a visualizar
        const gasType = filters.gasType || 'co2e';

        return invoices.map(inv => {
            const ai = inv.ai_analysis?.M || {};
            const ext = inv.extracted_data?.M || {};
            const climatiq = inv.climatiq_result?.M || {};

            return {
                id: inv.SK.S,
                vendor: ext.vendor?.S || "Desconocido",
                service: ai.service_type?.S || "N/A",
                invoiceDate: ext.invoice_date?.S,
                billingPeriod: {
                    start: ext.billing_period?.M.start?.S,
                    end: ext.billing_period?.M.end?.S
                },
                totalAmount: parseFloat(ext.total_amount?.N || 0),
                emissions: parseFloat(climatiq[gasType]?.N || 0),
                gasUnit: climatiq.co2e_unit?.S || "kg",
                confidence: parseFloat(ai.confidence_score?.N || 0),
                requiresReview: ai.requires_review?.BOOL || false
            };
        });
    },

    /** * Reporte de Auditoría: Identifica facturas que requieren supervisión manual.
     * @param {string} orgId - ID de la organización.
     * @returns {Promise<Array<Object>>} Facturas con bajo puntaje de confianza de IA.
     */
    getAuditReport: async (orgId) => {
        const threshold = 0.90; // Umbral de confianza definido para el SMS (Sustainability Management System)
        const suspicious = await repo.getLowConfidenceInvoices(orgId, threshold);
        
        return suspicious.map(inv => ({
            id: inv.SK.S,
            vendor: inv.extracted_data?.M.vendor?.S || "N/A",
            score: parseFloat(inv.ai_analysis?.M.confidence_score?.N || 0),
            invoiceNumber: inv.extracted_data?.M.invoice_number?.S || "S/N",
            reason: "Puntaje de confianza IA por debajo del umbral crítico (90%)"
        }));
    },

   /**
     * KPI: CARBON INTENSITY (RATIO DE EFICIENCIA)
     * -------------------------------------------------------------------------
     * CÁLCULO TÉCNICO: Σ Emissions (kgCO2e) / Σ Spend ($)
     * * VALOR DE NEGOCIO: 
     * Permite una comparación "justa" (Benchmarking) entre sedes, plantas o 
     * departamentos de distintos tamaños. Un edificio grande siempre emitirá más 
     * que uno pequeño, pero este ratio revela cuál de los dos es realmente más 
     * eficiente en su consumo operativo.
     * -------------------------------------------------------------------------
     */
    getCarbonIntensity: async (orgId, year) => {
        const stats = await repo.getStats(orgId, year);
        if (!stats) return { intensity: 0, status: "No Data" };

        const totalCo2 = parseFloat(stats.total_co2e_kg?.N || 0);
        const totalSpend = parseFloat(stats.total_spend?.N || 0);

        // A menor ratio, mayor "Desacoplamiento" (crecimiento económico con menor impacto)
        const ratio = totalSpend > 0 ? (totalCo2 / totalSpend) : 0;

        return {
            year,
            ratio: parseFloat(ratio.toFixed(4)),
            unit: "kgCO2e / $",
            label: "Eficiencia de Carbono por Inversión"
        };
    },

    /**
     * KPI: YEARLY FORECAST (PROYECCIÓN DE CIERRE)
     * -------------------------------------------------------------------------
     * CÁLCULO TÉCNICO: (Σ Emissions_Actual / Meses_con_Datos) * 12
     * * VALOR DE NEGOCIO: 
     * Actúa como un sistema de "Alerta Temprana" (Early Warning System). 
     * Permite predecir si la organización superará su presupuesto de carbono 
     * anual o sus metas de Net Zero antes de que termine el año fiscal, 
     * facilitando la toma de decisiones correctivas proactivas.
     * -------------------------------------------------------------------------
     */
    getForecast: async (orgId, year) => {
        const stats = await repo.getStats(orgId, year);
        if (!stats) return { projectedCo2: 0, status: "Insufficient Data" };

        const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
        let monthsWithData = 0;
        let accumulatedCo2 = 0;

        // Iteración sobre el mapa mensual del registro anual de DynamoDB
        months.forEach(m => {
            const val = parseFloat(stats[`month_${m}_co2e`]?.N || 0);
            if (val > 0) {
                monthsWithData++;
                accumulatedCo2 += val;
            }
        });

        if (monthsWithData === 0) return { message: "No hay datos para proyectar" };

        // Proyección lineal simple (Run Rate)
        const projectedCo2 = (accumulatedCo2 / monthsWithData) * 12;

        return {
            currentAccumulated: parseFloat(accumulatedCo2.toFixed(2)),
            monthsProcessed: monthsWithData,
            projectedYearlyTotal: parseFloat(projectedCo2.toFixed(2)),
            trend: projectedCo2 > accumulatedCo2 ? "Increasing" : "Stable"
        };
    }
};