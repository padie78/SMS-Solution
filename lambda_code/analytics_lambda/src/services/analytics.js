/**
 * @fileoverview Service Layer - Lógica de Negocio de Analíticas (SMS).
 * Maneja la transformación de datos planos de DynamoDB a estructuras para la UI.
 */

import { repo } from '../repository/dynamo.js';

export const analyticsService = {
    
    /**
     * 1. ESTRATÉGICO: Totales anuales para Scorecards.
     */
    getYearlyKPI: async (orgId, year) => {
        console.log(`[SERVICE] getYearlyKPI - Org: ${orgId}, Year: ${year}`);
        const stats = await repo.getStats(orgId, year);
        
        if (!stats) {
            console.warn(`[SERVICE] No stats found for Org: ${orgId}`);
            return null;
        }

        return {
            totalCo2e: parseFloat(stats.total_co2e_kg?.N || stats.total_co2e_kg || 0),
            totalSpend: parseFloat(stats.total_spend?.N || stats.total_spend || 0),
            invoiceCount: parseInt(stats.invoice_count?.N || stats.invoice_count || 0),
            lastFile: stats.last_file_processed?.S || stats.last_file_processed || "Ninguno",
            byService: {
                ELEC: parseFloat(stats.service_ELEC_co2e?.N || stats.service_ELEC_co2e || 0),
                GAS: parseFloat(stats.service_GAS_co2e?.N || stats.service_GAS_co2e || 0)
            }
        };
    },

   /**
     * 2. TÁCTICO: Comparativa MoM con manejo de meses vacíos.
     */
    getMonthlyKPI: async (orgId, year, month) => {
        const stats = await repo.getStats(orgId, year);
        if (!stats) return null;

        const currentM = month.toString().padStart(2, '0');
        const monthInt = parseInt(currentM);
        const prevMonthStr = (monthInt - 1).toString().padStart(2, '0');
        
        // Helper para extraer valor de Dynamo (maneja .N o valor directo)
        const getVal = (m, type) => parseFloat(stats[`month_${m}_${type}`]?.N || stats[`month_${m}_${type}`] || 0);

        const currentCo2 = getVal(currentM, 'co2e');
        const currentSpend = getVal(currentM, 'spend');
        const prevCo2 = monthInt > 1 ? getVal(prevMonthStr, 'co2e') : 0;
        const prevSpend = monthInt > 1 ? getVal(prevMonthStr, 'spend') : 0;

        const calculateDiff = (curr, prev) => (prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100);

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
     * 3. EVOLUCIÓN: Dataset completo para gráficos de series temporales.
     * Devuelve los 12 meses, rellena con 0 donde no hay data.
     */
    getEvolution: async (orgId, year, gasType = 'co2e') => {
        const stats = await repo.getStats(orgId, year);
        const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
        
        if (!stats) return months.map(m => ({ label: `Mes ${m}`, emissions: 0, spend: 0 }));

        return months.map(m => ({
            label: `Mes ${m}`,
            emissions: parseFloat(stats[`month_${m}_${gasType}`]?.N || stats[`month_${m}_${gasType}`] || 0),
            spend: parseFloat(stats[`month_${m}_spend`]?.N || stats[`month_${m}_spend`] || 0)
        }));
    },

    /**
     * 4. EFICIENCIA & BI: Intensidad y Proyecciones.
     */
    getIntensity: async (orgId, year) => {
        const stats = await repo.getStats(orgId, year);
        if (!stats) return null;

        const totalCo2 = parseFloat(stats.total_co2e_kg?.N || stats.total_co2e_kg || 0);
        const totalSpend = parseFloat(stats.total_spend?.N || stats.total_spend || 0);
        const ratio = totalSpend > 0 ? (totalCo2 / totalSpend) : 0;

        return {
            year,
            ratio: parseFloat(ratio.toFixed(4)),
            unit: "kgCO2e / $",
            label: "Intensidad de Carbono"
        };
    },

    getForecast: async (orgId, year) => {
        const stats = await repo.getStats(orgId, year);
        if (!stats) return null;

        let monthsWithData = 0;
        let accumulatedCo2 = 0;

        for (let i = 1; i <= 12; i++) {
            const m = i.toString().padStart(2, '0');
            const val = parseFloat(stats[`month_${m}_co2e`]?.N || stats[`month_${m}_co2e`] || 0);
            if (val > 0) { monthsWithData++; accumulatedCo2 += val; }
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
     * 5. GOBERNANZA: Auditoría de facturas sospechosas.
     */
    getAuditReport: async (orgId) => {
        const suspicious = await repo.getLowConfidenceInvoices(orgId, 0.90);
        return suspicious.map(inv => ({
            id: inv.SK.S || inv.SK,
            vendor: inv.extracted_data?.M?.vendor?.S || inv.extracted_data?.vendor || "N/A",
            score: parseFloat(inv.ai_analysis?.M?.confidence_score?.N || inv.ai_analysis?.confidence_score || 0),
            invoiceNumber: inv.extracted_data?.M?.invoice_number?.S || inv.extracted_data?.invoice_number || "S/N",
            reason: "Revisión requerida: Confianza IA < 90%"
        }));
    },

    /**
     * 6. EXPLORACIÓN: Motor de búsqueda para el DataGrid.
     * Simplificado: El mapeo principal ya ocurre en el REPO.
     */
    searchInvoices: async (orgId, args) => {
        // El repo ya devuelve un array de objetos limpios con pdfUrl
        const invoices = await repo.searchInvoices(orgId, args);
        
        // Si quieres asegurar consistencia o renombrar algún campo extra:
        return invoices.map(inv => {
    return {
        ...inv,
        // Priorizamos el ID que viene del repo mapeado
        id: inv.id || inv.SK, 
        
        // Mapeo de campos de negocio para el DataGrid
        service: inv.service || "N/A",
        
        // Estos campos vienen del repo, nos aseguramos de que existan
        consumption: inv.consumption || 0,
        unit: inv.unit || "kWh",
        
        // Metadatos para badges visuales (Rojo si confidence < 0.9)
        confidence: inv.confidence ?? 1.0,
        requiresReview: inv.requiresReview ?? false,
        
        // El link firmado que ya rescatamos
        pdfUrl: inv.pdfUrl || null
    };
});
    }
};