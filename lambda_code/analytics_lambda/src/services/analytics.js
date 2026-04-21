/**
 * @fileoverview Service Layer - Energy Intelligence System (SMS).
 * Centraliza la lógica de normalización y adaptación de granularidad.
 */
import { repo } from '../repository/dynamo.js';

export const analyticsService = {

    /**
     * Recupera y normaliza KPIs pre-calculados.
     * Garantiza un contrato de respuesta único para cualquier granularidad.
     */
    getPrecalculatedKPI: async (orgId, args) => {
        const { finalSK, timeContext } = _buildSK(args);

        try {
            const [item, orgConfig] = await Promise.all([
                repo.getStats(orgId, finalSK),
                repo.getOrgConfig(orgId)
            ]);

            if (!item) return null;

            // --- APLICACIÓN DEL CONTRATO DE NORMALIZACIÓN ---
            // Separamos la lógica para mantener el método principal limpio
            const granularity = item.entity_type || "MONTHLY_METRICS";
            
            if (granularity === "DAILY_METRICS" || granularity === "WEEKLY_METRICS") {
                return _mapFineGrained(item, orgConfig, timeContext);
            } else {
                return _mapCoarseGrained(item, orgConfig, timeContext);
            }

        } catch (error) {
            console.error("[SERVICE_ERROR]:", error);
            throw new Error(`Error en el motor de Energy Intelligence para ${finalSK}: ${error.message}`);
        }
    }
};

// --- MAPEADORES PRIVADOS (Normalización de Datos) ---

/**
 * Mapeador para registros de grano fino (Día/Semana).
 * Resuelve: ghg_total_co2e_kg -> ton y engineering_metrics -> advanced_analytics.
 */
const _mapFineGrained = (item, config, ctx) => {
    const factor = item.entity_type === "DAILY_METRICS" ? 365 : 52;
    const m2 = parseFloat(config?.totalGlobalM2) || 1;
    
    // Normalización de unidades y campos
    const co2_ton = (parseFloat(item.ghg_total_co2e_kg) / 1000) || 0;
    const spend = parseFloat(item.financials_total_spend) || 0;
    const intensity = parseFloat(item.engineering_metrics?.energy_intensity) || 0;
    const gas_val = parseFloat(item.consumption_gas_val) || 0;
    const elec_val = parseFloat(item.consumption_elec_val) || 0;

    // Benchmarking prorrateado
    const periodBudget = (parseFloat(config?.annualBudget) / factor) || 0;
    const periodTargetTon = (parseFloat(config?.reductionTargetTon) / factor) || 0;

    return {
        id: item.SK,
        metadata: { 
            ...ctx, 
            granularity: item.entity_type, 
            is_anomaly: item.engineering_metrics?.is_anomaly || false,
            lastUpdated: item.last_updated 
        },
        financials_total_spend: spend,
        cost_per_m2: spend / m2,
        budget_deviation_pct: periodBudget > 0 ? ((spend - periodBudget) / periodBudget) * 100 : 0,
        
        ghg_total_co2e_ton: co2_ton,
        ghg_total_co2e_kg: co2_ton * 1000,
        target_deviation_pct: periodTargetTon > 0 ? ((co2_ton - periodTargetTon) / periodTargetTon) * 100 : 0,

        energy_intensity_index: intensity,
        energy_intensity_per_m2: (gas_val + elec_val) / m2,
        consumption_gas_val: gas_val,
        consumption_elec_val: elec_val,

        advanced_analytics: {
            ...item.engineering_metrics,
            data_quality_score: "ESTIMATED",
            energy_source_mix: JSON.stringify({ grid: 100 }),
            renewable_energy_mix_pct: 0
        },
        predictive_engine: {
            forecast_year_end_co2: co2_ton * factor,
            target_annual_limit: parseFloat(config?.reductionTargetTon) || 0,
            projected_gap_vs_target: (parseFloat(config?.reductionTargetTon) || 0) - (co2_ton * factor)
        },
        management_reporting: { reporting_period_status: "OPEN", carbon_intensity_revenue: 0 },
        regulatory_compliance: { methodology: "GHG_ESTIMATION", reporting_standard: "ISO_14064_1" },
        sourceData: JSON.stringify(item)
    };
};

/**
 * Mapeador para registros de grano grueso (Mes/Año).
 * Usa estructuras nativas advanced_analytics y proyecciones de DB.
 */
const _mapCoarseGrained = (item, config, ctx) => {
    const factor = item.entity_type === "ANNUAL_METRICS" ? 1 : 12;
    const m2 = parseFloat(config?.totalGlobalM2) || 1;
    const co2_ton = parseFloat(item.ghg_total_co2e_ton) || 0;
    const spend = parseFloat(item.financials_total_spend) || 0;
    const gas_val = parseFloat(item.consumption_gas_val) || 0;
    const elec_val = parseFloat(item.consumption_elec_val) || 0;

    const periodBudget = (parseFloat(config?.annualBudget) / factor) || 0;
    const periodTargetTon = (parseFloat(config?.reductionTargetTon) / factor) || 0;

    return {
        id: item.SK,
        metadata: { 
            ...ctx, 
            granularity: item.entity_type, 
            is_anomaly: false,
            lastUpdated: item.last_updated 
        },
        financials_total_spend: spend,
        cost_per_m2: spend / m2,
        budget_deviation_pct: periodBudget > 0 ? ((spend - periodBudget) / periodBudget) * 100 : 0,

        ghg_total_co2e_ton: co2_ton,
        ghg_total_co2e_kg: co2_ton * 1000,
        target_deviation_pct: periodTargetTon > 0 ? ((co2_ton - periodTargetTon) / periodTargetTon) * 100 : 0,

        energy_intensity_index: parseFloat(item.advanced_analytics?.energy_intensity_index) || 0,
        energy_intensity_per_m2: (gas_val + elec_val) / m2,
        consumption_gas_val: gas_val,
        consumption_elec_val: elec_val,

        advanced_analytics: {
            ...item.advanced_analytics,
            transition_risk_scoring: JSON.stringify(item.advanced_analytics?.transition_risk_scoring || {}),
            energy_source_mix: JSON.stringify(item.advanced_analytics?.energy_source_mix || { grid: 100 })
        },
        predictive_engine: {
            ...item.predictive_engine,
            target_annual_limit: parseFloat(config?.reductionTargetTon) || 0,
            projected_gap_vs_target: (parseFloat(config?.reductionTargetTon) || 0) - (parseFloat(item.predictive_engine?.forecast_year_end_co2) || 0)
        },
        management_reporting: item.management_reporting || { reporting_period_status: "CLOSED" },
        regulatory_compliance: item.regulatory_compliance,
        sourceData: JSON.stringify(item)
    };
};

// --- HELPERS ---

/**
 * Construye la Sort Key jerárquica y el contexto temporal.
 */
const _buildSK = (args) => {
    const year = args.year || "2026";
    const month = args.month ? parseInt(args.month) : null;
    let skParts = ['STATS', year];
    
    if (args.quarter) skParts.push(args.quarter.toUpperCase());
    else if (month) skParts.push(`Q${Math.ceil(month / 3)}`);

    if (month) {
        skParts.push(`M${month.toString().padStart(2, '0')}`);
        if (args.day) skParts.push(`D${args.day.toString().padStart(2, '0')}`);
    } else if (args.week) {
        skParts.push(`W${args.week.toString().padStart(2, '0')}`);
    }

    return { 
        finalSK: skParts.join('#'), 
        timeContext: { year, quarter: args.quarter, month: month?.toString(), week: args.week, day: args.day } 
    };
};