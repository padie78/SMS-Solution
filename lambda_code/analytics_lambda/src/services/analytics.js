/**
 * @fileoverview Service Layer - Lógica de Negocio de Analíticas (SMS).
 * Adaptado para integrarse con AWS AppSync y DynamoDB Single Table Design.
 */

import { repo } from '../repository/dynamo.js';

export const analyticsService = {
    
    /**
     * 1. ESTRATÉGICO: getYearlyKPI
     * Mapea los totales anuales desde el item SK: STATS#YYYY
     */
    getYearlyKPI: async (orgId, year) => {
        console.log(`[SERVICE] getYearlyKPI invocado - Org: ${orgId}, Year: ${year}`);
        
        const stats = await repo.getStats(orgId, year);
        
        // LOG 1: Ver exactamente qué devolvió el repositorio antes de procesar
        console.log("[SERVICE] Respuesta cruda del REPO:", JSON.stringify(stats, null, 2));
        
        if (!stats) {
            console.warn(`[SERVICE] No se encontraron stats para Org: ${orgId} y Year: ${year}`);
            return null;
        }

        // Realizamos el mapeo
        const mappedResult = {
            totalCo2e: parseFloat(stats.total_co2e_kg?.N || stats.total_co2e_kg || 0),
            totalSpend: parseFloat(stats.total_spend?.N || stats.total_spend || 0),
            invoiceCount: parseInt(stats.invoice_count?.N || stats.invoice_count || 0),
            lastFile: stats.last_file_processed?.S || stats.last_file_processed || "Ninguno",
            byService: {
                ELEC: parseFloat(stats.service_ELEC_co2e?.N || stats.service_ELEC_co2e || 0),
                GAS: parseFloat(stats.service_GAS_co2e?.N || stats.service_GAS_co2e || 0)
            }
        };

        // LOG 2: Ver el objeto final que se le entrega al Resolver
        console.log("[SERVICE] Objeto mapeado enviado al Resolver:", JSON.stringify(mappedResult, null, 2));

        return mappedResult;
    },

   /**
     * 2. TÁCTICO: getMonthlyKPI
     * Calcula variaciones MoM (Month over Month) para los scorecards secundarios.
     */
    getMonthlyKPI: async (orgId, year, month) => {
        const stats = await repo.getStats(orgId, year);
        if (!stats) return null;

        const currentM = month.toString().padStart(2, '0');
        const monthInt = parseInt(currentM);
        const prevMonthStr = (monthInt - 1).toString().padStart(2, '0');
        
        const currentCo2 = parseFloat(stats[`month_${currentM}_co2e`]?.N || 0);
        const currentSpend = parseFloat(stats[`month_${currentM}_spend`]?.N || 0);
        const prevCo2 = monthInt > 1 ? parseFloat(stats[`month_${prevMonthStr}_co2e`]?.N || 0) : 0;
        const prevSpend = monthInt > 1 ? parseFloat(stats[`month_${prevMonthStr}_spend`]?.N || 0) : 0;

        const calculateDiff = (curr, prev) => (prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100);

        // Retorno estructurado según el tipo MonthlyKPI del Schema
        return {
            month: currentM,
            year: year,
            emissions: {
                value: currentCo2,
                previousValue: prevCo2,
                diffPercentage: parseFloat(calculateDiff(currentCo2, prevCo2).toFixed(2))
            },
            spend: {
                value: currentSpend,
                previousValue: prevSpend,
                diffPercentage: parseFloat(calculateDiff(currentSpend, prevSpend).toFixed(2))
            },
            isEmissionsUp: currentCo2 > prevCo2,
            isSpendUp: currentSpend > prevSpend
        };
    },

    /**
     * 3. EVOLUCIÓN: getEvolution
     * Formatea datos para ECharts.
     */
    getEvolution: async (orgId, year, gasType = 'co2e') => {
        const stats = await repo.getStats(orgId, year);
        if (!stats) return [];

        const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
        
        return months.map(m => ({
            label: `Mes ${m}`,
            emissions: parseFloat(stats[`month_${m}_${gasType}`]?.N || 0),
            spend: parseFloat(stats[`month_${m}_spend`]?.N || 0)
        })).filter(d => d.emissions > 0 || d.spend > 0);
    },

    /**
     * 4. EFICIENCIA: getIntensity
     * Ratio de kgCO2e por cada Euro/Dólar invertido.
     */
    getIntensity: async (orgId, year) => {
        const stats = await repo.getStats(orgId, year);
        if (!stats) return null;

        const totalCo2 = parseFloat(stats.total_co2e_kg?.N || 0);
        const totalSpend = parseFloat(stats.total_spend?.N || 0);
        const ratio = totalSpend > 0 ? (totalCo2 / totalSpend) : 0;

        return {
            year,
            ratio: parseFloat(ratio.toFixed(4)),
            unit: "kgCO2e / $",
            label: "Intensidad de Carbono"
        };
    },

    /**
     * 5. BUSINESS INTELLIGENCE: getForecast
     * Proyección lineal al cierre del año.
     */
    getForecast: async (orgId, year) => {
        const stats = await repo.getStats(orgId, year);
        if (!stats) return null;

        let monthsWithData = 0;
        let accumulatedCo2 = 0;

        for (let i = 1; i <= 12; i++) {
            const m = i.toString().padStart(2, '0');
            const val = parseFloat(stats[`month_${m}_co2e`]?.N || 0);
            if (val > 0) { 
                monthsWithData++; 
                accumulatedCo2 += val; 
            }
        }

        const projected = monthsWithData > 0 ? (accumulatedCo2 / monthsWithData) * 12 : 0;

        return {
            currentAccumulated: parseFloat(accumulatedCo2.toFixed(2)),
            monthsProcessed: monthsWithData,
            projectedYearlyTotal: parseFloat(projected.toFixed(2)),
            trend: projected > accumulatedCo2 ? "Increasing" : "Stable"
        };
    },

    /**
     * 6. GOBERNANZA: getAuditReport
     * Lista facturas con bajo score de confianza (IA).
     */
    getAuditReport: async (orgId) => {
        const suspicious = await repo.getLowConfidenceInvoices(orgId, 0.90);
        
        return suspicious.map(inv => ({
            id: inv.SK.S,
            vendor: inv.extracted_data?.M.vendor?.S || "N/A",
            score: parseFloat(inv.ai_analysis?.M.confidence_score?.N || 0),
            invoiceNumber: inv.extracted_data?.M.invoice_number?.S || "S/N",
            reason: "Requiere validación humana (Confianza < 90%)"
        }));
    },

    /**
     * 7. EXPLORACIÓN: searchInvoices
     * Mapeo para el DataGrid con filtros.
     */
    searchInvoices: async (orgId, args) => {
        const invoices = await repo.searchInvoices(orgId, args);
        
        return invoices.map(inv => {
            const ai = inv.ai_analysis?.M || {};
            const ext = inv.extracted_data?.M || {};
            const climatiq = inv.climatiq_result?.M || {};

            return {
                id: inv.SK.S,
                vendor: ext.vendor?.S || "Desconocido",
                service: ai.service_type?.S || "N/A",
                invoiceDate: ext.invoice_date?.S || "N/A",
                totalAmount: parseFloat(ext.total_amount?.N || 0),
                emissions: parseFloat(climatiq.co2e?.N || 0),
                gasUnit: climatiq.co2e_unit?.S || "kg",
                confidence: parseFloat(ai.confidence_score?.N || 0),
                requiresReview: ai.requires_review?.BOOL || false
            };
        });
    }
};