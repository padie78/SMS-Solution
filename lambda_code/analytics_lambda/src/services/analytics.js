/**
 * @fileoverview Service Layer - Lógica de Negocio de Analíticas (SMS).
 * Centraliza la construcción de Sort Keys y el mapeo de datos.
 */
import { repo } from '../repository/dynamo.js';

// Helper para mapear dinámicamente el ServiceBreakdown desde los prefijos consumption_*
const mapServiceBreakdown = (item) => {
    if (!item) return null;
    return {
        elec_spend: item.consumption_elec_spend || 0,
        elec_val: item.consumption_elec_val || 0,
        elec_unit: item.consumption_elec_unit || "kWh",
        gas_spend: item.consumption_gas_spend || 0,
        gas_val: item.consumption_gas_val || 0,
        gas_unit: item.consumption_gas_unit || "kWh"
    };
};

export const analyticsService = {

    /**
     * 1. ESTRATÉGICO: KPIs (Anuales, Mensuales y Trimestrales)
     */
    getYearlyKPI: async (orgId, year) => {
        const SK = `STATS#YEAR#${year}`;
        const item = await repo.getStats(orgId, SK); // Usamos el repo!
        if (!item) return null;

        return {
            id: item.SK,
            totalCo2eTon: item.ghg_total_co2e_ton || 0,
            totalSpend: item.financials_total_spend || 0,
            invoiceCount: item.trazabilidad_total_invoices || 0,
            lastUpdated: item.last_updated,
            byService: mapServiceBreakdown(item),
            normalization: item.normalization_kpis,
            environmental: item.environmental_impact,
            weather: item.weather_adjustment,
            metadata: item.metadata
        };
    },

    getQuarterlyKPI: async (orgId, year, quarter) => {
        const SK = `STATS#YEAR#${year}#${quarter}`;
        const item = await repo.getStats(orgId, SK);
        if (!item) return null;

        return {
            id: item.SK,
            totalCo2eTon: item.ghg_total_co2e_ton || 0,
            totalSpend: item.financials_total_spend || 0,
            byService: mapServiceBreakdown(item),
            normalization: item.normalization_kpis
        };
    },

    getMonthlyKPI: async (orgId, year, month) => {
        const m = month.padStart(2, '0');
        const SK = `STATS#YEAR#${year}#M${m}`; // Formato correcto M01
        const item = await repo.getStats(orgId, SK);
        if (!item) return null;

        return {
            id: item.SK,
            totalCo2eTon: item.ghg_total_co2e_ton || 0,
            totalSpend: item.financials_total_spend || 0,
            byService: mapServiceBreakdown(item),
            normalization: item.normalization_kpis
        };
    },

    getWeeklyKPI: async (orgId, year, week) => {
        const w = week.padStart(2, '0');
        const SK = `STATS#WEEK#${year}#W${w}`;
        const item = await repo.getStats(orgId, SK);
        if (!item) return null;

        return {
            id: item.SK,
            totalCo2eKg: item.ghg_total_co2e_kg || 0,
            totalSpend: item.financials_total_spend || 0,
            lastUpdated: item.last_updated,
            byService: mapServiceBreakdown(item),
            normalization: item.normalization_kpis
        };
    },

    getDailyKPI: async (orgId, day) => {
        const SK = `STATS#DAY#${day}`; 
        const item = await repo.getStats(orgId, SK);
        if (!item) return null;

        return {
            id: item.SK,
            totalCo2eKg: item.ghg_total_co2e_kg || 0,
            totalSpend: item.financials_total_spend || 0,
            byService: mapServiceBreakdown(item),
            normalization: item.normalization_kpis
        };
    },

    /**
     * 2. TENDENCIAS (Year over Year)
     */
    getYearOverYear: async (orgId, month, year) => {
        const mStr = month.toString().padStart(2, '0');
        const prevYear = (parseInt(year) - 1).toString();

        // Corregido: Las Sort Keys deben seguir el patrón de la tabla
        const skCurrent = `STATS#YEAR#${year}#M${mStr}`;
        const skPrev = `STATS#YEAR#${prevYear}#M${mStr}`;

        const [currentStats, prevStats] = await Promise.all([
            repo.getStats(orgId, skCurrent),
            repo.getStats(orgId, skPrev)
        ]);

        const current = {
            emissions: parseFloat(currentStats?.ghg_total_co2e_ton || 0),
            spend: parseFloat(currentStats?.financials_total_spend || 0)
        };
        const previous = {
            emissions: parseFloat(prevStats?.ghg_total_co2e_ton || 0),
            spend: parseFloat(prevStats?.financials_total_spend || 0)
        };

        return {
            month: parseInt(month),
            currentYear: current,
            previousYear: previous,
            diffPercentageEmissions: calculateDiff(current.emissions, previous.emissions),
            efficiencyImprovement: previous.spend > 0 ? (current.emissions / current.spend) < (previous.emissions / previous.spend) : false
        };
    }
};

/**
 * HELPERS
 */
const calculateDiff = (curr, prev) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return parseFloat((((curr - prev) / prev) * 100).toFixed(2));
};