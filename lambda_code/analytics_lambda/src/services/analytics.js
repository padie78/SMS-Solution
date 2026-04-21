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

        // 1. Construcción de SK Jerárquica
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

            // --- Extracción de Atributos y Configuración ---
            const financials_total_spend = parseFloat(item.financials_total_spend) || 0;
            const ghg_total_co2e_ton = parseFloat(item.ghg_total_co2e_ton) || 0;
            const gas_val = parseFloat(item.consumption_gas_val) || 0;
            const elec_val = parseFloat(item.consumption_elec_val) || 0;
            const m2 = parseFloat(orgConfig?.totalGlobalM2) || 1;

            // Lógica de Benchmarking (Prorrateo Mensual)
            const monthlyBudget = (parseFloat(orgConfig?.annualBudget) / 12) || 0;
            const monthlyTargetTon = (parseFloat(orgConfig?.reductionTargetTon) / 12) || 0;

            // --- Retorno con KPIs Comparativos ---
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

                // --- KPIs FINANCIEROS (Real vs Budget) ---
                financials_total_spend,
                cost_per_m2: financials_total_spend / m2,
                budget_deviation_pct: monthlyBudget > 0 
                    ? ((financials_total_spend - monthlyBudget) / monthlyBudget) * 100 
                    : 0,
                savings_realized: parseFloat(item.savings_realized) || 0,
                
                // --- KPIs ENERGÍA (Eficiencia Operativa) ---
                consumption_gas_val: gas_val,
                consumption_elec_val: elec_val,
                energy_intensity_index: parseFloat(item.advanced_analytics?.energy_intensity_index) || 0,
                energy_intensity_per_m2: (gas_val + elec_val) / m2,
                phantom_load_kwh: parseFloat(item.advanced_analytics?.phantom_load_kwh) || 0,
                
                // --- KPIs SUSTENTABILIDAD (Real vs Target) ---
                ghg_total_co2e_ton,
                ghg_total_co2e_kg: ghg_total_co2e_ton * 1000,
                target_deviation_pct: monthlyTargetTon > 0 
                    ? ((ghg_total_co2e_ton - monthlyTargetTon) / monthlyTargetTon) * 100 
                    : 0,
                carbon_intensity_revenue: parseFloat(item.management_reporting?.carbon_intensity_revenue) || 0,
                renewable_energy_mix_pct: parseFloat(item.advanced_analytics?.renewable_energy_mix_pct) || 0,

                // Bloques de Lógica (Preservando estructura 1:1)
                advanced_analytics: {
                    ...item.advanced_analytics,
                    transition_risk_scoring: JSON.stringify(item.advanced_analytics?.transition_risk_scoring || {}),
                    energy_source_mix: JSON.stringify(item.advanced_analytics?.energy_source_mix || { grid: 100 }),
                    data_quality_score: item.advanced_analytics?.data_quality_score || "ESTIMATED"
                },

                predictive_engine: {
                    ...item.predictive_engine,
                    forecast_year_end_co2: parseFloat(item.predictive_engine?.forecast_year_end_co2) || (ghg_total_co2e_ton * 12),
                    current_vs_target_pct: parseFloat(item.predictive_engine?.current_vs_target_pct) || 0,
                    projected_gap_vs_target: (parseFloat(orgConfig?.reductionTargetTon) || 0) - (parseFloat(item.predictive_engine?.forecast_year_end_co2) || (ghg_total_co2e_ton * 12))
                },

                management_reporting: item.management_reporting,
                regulatory_compliance: item.regulatory_compliance,

                // Trazabilidad
                trazabilidad_total_invoices: parseInt(item.trazabilidad_total_invoices) || 0,
                last_updated: item.last_updated,
                sourceData: JSON.stringify({ ...item, applied_config: { monthlyBudget, monthlyTargetTon } })
            };
        } catch (error) {
            console.error("[SERVICE_ERROR]:", error);
            throw new Error(`Error procesando Energy Intelligence para ${finalSK}: ${error.message}`);
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