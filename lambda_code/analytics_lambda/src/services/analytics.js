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
 * Recupera KPIs pre-calculados desde la tabla principal (Patrón Single Table).
 * Soporta granularidad: Año, Quarter, Mes y Día.
 */
    getPrecalculatedKPI: async (orgId, args) => {
        const year = args.year || "2026";
        const month = parseInt(args.month);
        
        // 1. Construcción de la SK Jerárquica
        const q = Math.ceil(month / 3);
        const finalSK = `STATS#${year}#Q${q}#M${month.toString().padStart(2, '0')}`;

        try {
            // 2. Traemos la data del mes (DynamoDB) y la configuración (Baseline/Metas)
            // Usamos Promise.all para optimizar la latencia
            const [item, orgConfig] = await Promise.all([
                repo.getStats(orgId, finalSK),
                repo.getOrgConfig(orgId)
            ]);

            if (!item) return null;

            // --- 3. EXTRACCIÓN Y LIMPIEZA DE VALORES REALES (BD) ---
            const currentSpend = parseFloat(item.financials_total_spend) || 0;
            const currentGasVal = parseFloat(item.consumption_gas_val) || 0;
            const currentCo2Ton = parseFloat(item.ghg_total_co2e_ton) || 0;
            const currentCo2Kg = currentCo2Ton * 1000;

            // --- 4. CÁLCULOS DE CONFIGURACIÓN (Benchmarks) ---
            const targetAnnualCo2 = parseFloat(orgConfig?.reductionTargetTon) || 50;
            const baselineAvgMonthlySpend = parseFloat(orgConfig?.baselineMonthlySpend) || 200;
            const revenueMonthly = parseFloat(orgConfig?.estimatedMonthlyRevenue) || 1;

            // A. Variación vs Baseline Financiero (¿Gastamos más de lo normal?)
            const vsBaselineSpendPct = ((currentSpend / baselineAvgMonthlySpend) - 1) * 100;

            // B. Análisis de "Pace" (Ritmo de consumo vs Meta Anual)
            // Si estamos en el mes 4 (33.3% del año), el consumo debería ser <= 33.3% del target
            const theoreticalYearPacePct = (month / 12) * 100;
            const actualTargetProgressPct = (currentCo2Ton / targetAnnualCo2) * 100;
            const isOverBudget = actualTargetProgressPct > theoreticalYearPacePct;

            // --- 5. KPIs DE NEGOCIO (Real-time Intelligence) ---
            const unitCostKwh = currentGasVal > 0 ? (currentSpend / currentGasVal) : 0;
            const carbonIntensity = currentSpend > 0 ? (currentCo2Kg / currentSpend) : 0;
            const riskExposure = parseFloat(item.predictive_engine?.financial_risk_exposure) || 0;

            // --- 6. RETORNO COMPLETO PARA EL FRONTEND ---
            return {
                id: item.SK,
                metadata: {
                    orgId,
                    year,
                    month,
                    granularity: "MONTHLY",
                    lastUpdated: item.last_updated,
                    isEstimated: item.advanced_analytics?.data_quality_score === "ESTIMATED"
                },

                // Bloque Financiero: Comparativa vs Histórico
                financials: {
                    financials_total_spend: currentSpend,
                    consumption_gas_spend: parseFloat(item.consumption_gas_spend) || 0,
                    currency: orgConfig?.currency || "USD",
                    kpi_unit_cost_kwh: unitCostKwh.toFixed(4),
                    vs_baseline_spend_pct: vsBaselineSpendPct.toFixed(2)
                },

                // Bloque Energía: Eficiencia técnica
                energy: {
                    consumption_gas_val: currentGasVal,
                    consumption_gas_unit: item.consumption_gas_unit,
                    energy_intensity_index: parseFloat(item.advanced_analytics?.energy_intensity_index) || 0,
                    efficiency_rating: currentGasVal < (orgConfig?.efficiencyThreshold || 2000) ? "OPTIMAL" : "CRITICAL"
                },

                // Bloque Sustentabilidad: Progreso de Metas
                sustainability: {
                    ghg_total_co2e_kg: currentCo2Kg.toFixed(2),
                    ghg_total_co2e_ton: currentCo2Ton,
                    kpi_carbon_intensity_per_spend: carbonIntensity.toFixed(3),
                    current_annual_progress_pct: actualTargetProgressPct.toFixed(2),
                    status_pace_alert: isOverBudget,
                    reporting_period_status: item.management_reporting?.reporting_period_status
                },

                // Bloque de Inteligencia Predictiva (Proyecciones)
                predictive: {
                    financial_risk_exposure: riskExposure,
                    target_annual_limit_ton: targetAnnualCo2,
                    forecast_year_end_co2_ton: (currentCo2Ton * 12).toFixed(2), // Proyección lineal simple
                    estimated_year_end_spend: (currentSpend * 12).toFixed(2),
                    projected_gap_vs_target: (targetAnnualCo2 - (currentCo2Ton * 12)).toFixed(2)
                },

                // Bloque Operacional (Calidad de Data)
                operational: {
                    data_quality_score: item.advanced_analytics?.data_quality_score,
                    trazabilidad_total_invoices: parseInt(item.trazabilidad_total_invoices) || 0,
                    emission_factor_source: item.advanced_analytics?.emission_factor_source,
                    methodology: item.regulatory_compliance?.methodology
                },

                // Objeto crudo para flexibilidad total en el front
                sourceData: JSON.stringify(item)
            };
        } catch (error) {
            console.error(`[Analytics Service Error]: ${error.message}`);
            throw new Error(`Error procesando KPIs para la Org ${orgId}: ${error.message}`);
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