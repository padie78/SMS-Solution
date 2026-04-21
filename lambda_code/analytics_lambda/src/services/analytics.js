/**
 * @fileoverview Service Layer - Lógica de Negocio de Analíticas (SMS).
 * Centraliza la construcción de Sort Keys y el mapeo de datos.
 */
import { repo } from '../repository/dynamo.js';

// Helper para mapear dinámicamente el ServiceBreakdown desde los prefijos consumption_*
const mapServiceBreakdown = (item) => {
    if (!item) return null;
    return {
        elec_spend: parseFloat(item.consumption_elec_spend) || 0,
        elec_val: parseFloat(item.consumption_elec_val) || 0,
        gas_spend: parseFloat(item.consumption_gas_spend) || 0,
        gas_val: parseFloat(item.consumption_gas_val) || 0,
        hvac_val: 0, 
        lighting_val: 0,
        other_val: 0
    };
};

export const analyticsService = {

    /**
     * Recupera KPIs pre-calculados desde la tabla principal (Patrón Single Table).
     * Soporta granularidad: Año, Quarter, Mes y Día.
     */
    getPrecalculatedKPI: async (orgId, args) => {
        const year = args.year || "2026";
        const month = args.month ? parseInt(args.month) : null;
        const { week, quarter, day } = args;

        // 1. Construcción de SK (Jerarquía: STATS#YEAR#QUARTER#MONTH...)
        let skParts = ['STATS', year];
        if (quarter) skParts.push(quarter.toUpperCase());
        else if (month) skParts.push(`Q${Math.ceil(month / 3)}`);

        if (month) {
            skParts.push(`M${month.toString().padStart(2, '0')}`);
            if (day) skParts.push(`D${day.toString().padStart(2, '0')}`);
        } else if (week) {
            skParts.push(`W${week.toString().padStart(2, '0')}`);
        }

        const finalSK = skParts.join('#');

        try {
            const [item, orgConfig] = await Promise.all([
                repo.getStats(orgId, finalSK),
                repo.getOrgConfig(orgId)
            ]);

            if (!item) return null;

            // 2. Extracción de Atributos Base de DynamoDB
            const financials_total_spend = parseFloat(item.financials_total_spend) || 0;
            const ghg_total_co2e_ton = parseFloat(item.ghg_total_co2e_ton) || 0;
            const gas_val = parseFloat(item.consumption_gas_val) || 0;
            const elec_val = parseFloat(item.consumption_elec_val) || 0;
            const m2 = parseFloat(orgConfig?.totalGlobalM2) || 1;

            // 3. Mapeo Integral 1:1 y Calculado
            return {
                id: item.SK,
                metadata: {
                    orgId,
                    year,
                    quarter,
                    month: month?.toString(),
                    week,
                    day,
                    granularity: item.entity_type || (week ? "WEEKLY" : "MONTHLY"),
                    lastUpdated: item.last_updated
                },

                // --- KEY PERFORMANCE INDICATORS (KPIs) ---
                
                // Financieros
                financials_total_spend,
                cost_per_m2: financials_total_spend / m2,
                savings_realized: parseFloat(item.savings_realized) || 0,
                
                // Energía e Intensidad
                consumption_gas_val: gas_val,
                consumption_elec_val: elec_val,
                energy_intensity_index: parseFloat(item.advanced_analytics?.energy_intensity_index) || 0,
                phantom_load_kwh: parseFloat(item.advanced_analytics?.phantom_load_kwh) || 0,
                
                // Sustentabilidad
                ghg_total_co2e_ton,
                ghg_total_co2e_kg: ghg_total_co2e_ton * 1000,
                carbon_intensity_revenue: parseFloat(item.management_reporting?.carbon_intensity_revenue) || 0,
                renewable_energy_mix_pct: parseFloat(item.advanced_analytics?.renewable_energy_mix_pct) || 0,

                // Bloques Complejos (Mapeo por referencia)
                advanced_analytics: {
                    ...item.advanced_analytics,
                    transition_risk_scoring: JSON.stringify(item.advanced_analytics?.transition_risk_scoring || {}),
                    energy_source_mix: JSON.stringify(item.advanced_analytics?.energy_source_mix || { grid: 100 }),
                    data_quality_score: item.advanced_analytics?.data_quality_score || "ESTIMATED"
                },

                predictive_engine: {
                    ...item.predictive_engine,
                    // Si no hay forecast en DB, hacemos una proyección lineal simple
                    forecast_year_end_co2: parseFloat(item.predictive_engine?.forecast_year_end_co2) || (ghg_total_co2e_ton * 12),
                    current_vs_target_pct: parseFloat(item.predictive_engine?.current_vs_target_pct) || 0
                },

                management_reporting: item.management_reporting,
                regulatory_compliance: item.regulatory_compliance,

                // Trazabilidad y Auditoría
                trazabilidad_total_invoices: parseInt(item.trazabilidad_total_invoices) || 0,
                last_updated: item.last_updated,
                sourceData: JSON.stringify(item)
            };
        } catch (error) {
            console.error("[SERVICE_ERROR]:", error);
            throw new Error(`Error procesando KPIs para ${finalSK}: ${error.message}`);
        }
    }
};

/**
 * HELPERS
 */
const calculateDiff = (curr, prev) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return parseFloat((((curr - prev) / prev) * 100).toFixed(2));
};