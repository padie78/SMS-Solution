import { repo } from '../repository/dynamoDb.js';

export const analyticsService = {
    // 1. Resumen de KPIs (Cards superiores del Dashboard)
    /**
     * Obtiene un resumen rápido de los KPIs más importantes para el año solicitado.
     * @param {string} orgId - ID de la organización.
     * @param {string} year - Año de consulta (ej: "2026").
     * @returns {Object} Resumen con totales de emisiones, gasto y desglose por servicio.
     */
    getSummary: async (orgId, year) => {
        const stats = await repo.getYearlyStats(orgId, year);
        if (!stats) return { message: "Sin datos consolidados para este periodo" };

        return {
            totalCo2e: parseFloat(stats.total_co2e_kg?.N || 0),
            totalSpend: parseFloat(stats.total_spend?.N || 0),
            invoiceCount: parseInt(stats.invoice_count?.N || 0),
            lastFile: stats.last_file_processed?.S,
            byService: {
                ELEC: parseFloat(stats.service_ELEC_co2e?.N || 0),
                GAS: parseFloat(stats.service_GAS_co2e?.N || 0)
            }
        };
    },

    // 2. Evolución Mensual (ECharts - Line/Bar Chart)
    // Soporta filtrar por un gas específico (co2, ch4, n2o) o el equivalente (co2e)
    /**
     * Calcula la evolución mensual de emisiones y gastos.
     * @param {string} orgId - Identificador único de la empresa.
     * @param {string} year - Año de consulta (ej: "2026").
     * @param {string} gasType - El gas específico que se desea graficar.
     * @returns {Array<Object>} Lista de 12 meses con valores de emisiones y gasto.
     */
    getEvolution: async (orgId, year, gasType = 'co2e') => {
        const stats = await repo.getYearlyStats(orgId, year);
        if (!stats) return [];

        const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
        
        return months.map(m => {
            // Buscamos dinámicamente el campo del gas solicitado (ej: month_04_ch4)
            const emissionValue = stats[`month_${m}_${gasType}`]?.N || 0;
            const spendValue = stats[`month_${m}_spend`]?.N || 0;

            return {
                label: `Mes ${m}`,
                emissions: parseFloat(emissionValue),
                spend: parseFloat(spendValue)
            };
        }).filter(d => d.emissions > 0 || d.spend > 0);
    },

    // 3. Búsqueda Avanzada (Tabla de Datos con Filtros)
    // Ahora usa el método searchInvoices del repo que filtra en la DB
    /**
     * Ejecuta una búsqueda profunda sobre las facturas individuales.
     * @param {Object} filters - Objeto con criterios de búsqueda (vendor, service, amount, etc).
     * @returns {Promise<Array>} Listado de facturas mapeadas para la tabla de Angular.
     */
    getAdvancedSearch: async (orgId, filters) => {
        const invoices = await repo.searchInvoices(orgId, filters);
        
        const gasType = filters.gasType || 'co2e';

        return invoices.map(inv => {
            const ai = inv.ai_analysis.M;
            const ext = inv.extracted_data.M;
            const climatiq = inv.climatiq_result.M;

            return {
                id: inv.SK.S,
                vendor: ext.vendor.S,
                service: ai.service_type.S,
                invoiceDate: ext.invoice_date.S,
                billingPeriod: {
                    start: ext.billing_period.M.start.S,
                    end: ext.billing_period.M.end.S
                },
                totalAmount: parseFloat(ext.total_amount.N),
                emissions: parseFloat(climatiq[gasType]?.N || 0),
                gasUnit: climatiq.co2e_unit.S,
                confidence: parseFloat(ai.confidence_score.N),
                requiresReview: ai.requires_review.BOOL
            };
        });
    },

    // 4. Reporte de Auditoría (Facturas sospechosas)
    /** 
     * Genera un reporte de facturas con baja confianza en el análisis de IA, para revisión manual.
     * @param {string} orgId - Identificador de la organización.
     * @returns {Promise<Array>} Listado de facturas que requieren auditoría.
     */
    getAuditReport: async (orgId) => {
        const threshold = 0.90;
        const suspicious = await repo.getLowConfidenceInvoices(orgId, threshold);
        
        return suspicious.map(inv => ({
            id: inv.SK.S,
            vendor: inv.extracted_data.M.vendor.S,
            score: parseFloat(inv.ai_analysis.M.confidence_score.N),
            invoiceNumber: inv.extracted_data.M.invoice_number.S,
            reason: "Puntaje de confianza IA por debajo del umbral de seguridad"
        }));
    }
};