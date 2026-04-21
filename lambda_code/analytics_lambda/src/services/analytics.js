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

      // --- Valores Base ---
      const totalSpend = parseFloat(item.financials_total_spend) || 0;
      const gasVal = parseFloat(item.consumption_gas_val) || 0;
      const co2Ton = parseFloat(item.ghg_total_co2e_ton) || 0;
      const targetAnnualCo2 = parseFloat(orgConfig?.reductionTargetTon) || 50;

      // --- MAPEO AL SCHEMA TIPADO ---
      return {
        id: item.SK,
        metadata: {
          orgId,
          year,
          quarter,
          month: month?.toString(),
          week,
          day,
          granularity: week ? "WEEKLY" : (month ? "MONTHLY" : "YEARLY"),
          lastUpdated: item.last_updated
        },

        // Bloque Financiero (Preguntas #15, #17, #18, #21)
        financials: {
          totalSpend: totalSpend,
          currency: orgConfig?.currency || "USD",
          costPerM2: totalSpend / (orgConfig?.totalGlobalM2 || 1),
          savingsRealized: parseFloat(item.savings_realized) || 0,
          savingsPending: parseFloat(item.predictive_engine?.financial_risk_exposure) || 0,
          avoidedCost: parseFloat(item.avoided_cost) || 0,
          taxRiskExposure: JSON.stringify(item.advanced_analytics?.transition_risk_scoring || {})
        },

        // Bloque Energía (Preguntas #3, #11, #14, #22, #12)
        energy: {
          consumptionKwh: gasVal,
          intensityIndex: parseFloat(item.advanced_analytics?.energy_intensity_index) || 0,
          phantomLoadKwh: parseFloat(item.advanced_analytics?.phantom_load_kwh) || 0,
          idleEnergyCost: parseFloat(item.advanced_analytics?.idle_energy_cost) || 0,
          gridEfficiency: parseFloat(item.advanced_analytics?.grid_efficiency) || 1,
          baseloadKwh: parseFloat(item.advanced_analytics?.baseload_kwh) || 0
        },

        // Bloque Sustentabilidad (Preguntas #19, #8, #23)
        sustainability: {
          totalCo2eKg: co2Ton * 1000,
          carbonIntensity: parseFloat(item.management_reporting?.carbon_intensity_revenue) || 0,
          renewableRatio: parseFloat(item.advanced_analytics?.renewable_energy_mix_pct) || 0,
          netZeroGapPct: parseFloat(item.predictive_engine?.current_vs_target_pct) || 0,
          complianceStatus: item.sustainability?.complianceStatus || "PENDING",
          weatherNormalizedUsage: parseFloat(item.advanced_analytics?.weather_normalized_usage) || gasVal
        },

        // Bloque Operacional (Preguntas #9, #24, #7, #16, #5, #13)
        operational: {
          dataQualityScore: parseFloat(item.advanced_analytics?.data_quality_score_pct) || 75,
          reliabilityPct: parseFloat(item.advanced_analytics?.data_reliability_pct) || 100,
          gridHealthIncidents: parseInt(item.trazabilidad_total_invoices) || 0,
          activeVsIdleRatio: parseFloat(item.advanced_analytics?.active_idle_ratio) || 0,
          nominalLoadPerformance: parseFloat(item.advanced_analytics?.nominal_load_perf) || 0
        },

        // Bloque Predictivo (Proyecciones)
        predictive: {
          financial_risk_exposure: parseFloat(item.predictive_engine?.financial_risk_exposure) || 0,
          target_annual_limit_ton: targetAnnualCo2,
          forecast_year_end_co2_ton: parseFloat(item.predictive_engine?.forecast_year_end_co2) || (currentCo2Ton * 12),
          projected_gap_vs_target: targetAnnualCo2 - (currentCo2Ton * 12)
        },

        // Bloque de cumplimiento
        compliance: {
          methodology: item.regulatory_compliance?.methodology,
          standard: item.regulatory_compliance?.reporting_standard
        },

        sourceData: JSON.stringify(item)
      };
    } catch (error) {
      console.error("Analytics Service Error:", error);
      throw new Error(`Error calculando KPIs: ${error.message}`);
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