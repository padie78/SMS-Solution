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
        const { month } = args;

        // Construcción de la SK (STATS#2026#Q2#M04)
        const q = Math.ceil(parseInt(month) / 3);
        const finalSK = `STATS#${year}#Q${q}#M${month.toString().padStart(2, '0')}`;

        try {
            const item = await repo.getStats(orgId, finalSK);
            if (!item) return null;

            // Armamos la respuesta mapeando directamente a tus campos de BD
            return {
                id: item.SK,
                metadata: {
                    orgId,
                    year,
                    month,
                    last_updated: item.last_updated,
                    version: item.metadata?.version
                },

                // Bloque Financiero: Nombres tal cual la BD
                financials: {
                    financials_total_spend: parseFloat(item.financials_total_spend) || 0,
                    consumption_gas_spend: parseFloat(item.consumption_gas_spend) || 0,
                    currency: "USD"
                },

                // Bloque Energía: Nombres tal cual la BD
                energy: {
                    consumption_gas_val: parseFloat(item.consumption_gas_val) || 0,
                    consumption_gas_unit: item.consumption_gas_unit,
                    energy_intensity_index: parseFloat(item.advanced_analytics?.energy_intensity_index) || 0
                },

                // Bloque Sustentabilidad: Conservamos la unidad 'ton' para ser fieles
                sustainability: {
                    ghg_total_co2e_ton: parseFloat(item.ghg_total_co2e_ton) || 0,
                    carbon_intensity_revenue: parseFloat(item.management_reporting?.carbon_intensity_revenue) || 0,
                    reporting_period_status: item.management_reporting?.reporting_period_status
                },

                // Bloque Operacional y Calidad
                operational: {
                    data_quality_score: item.advanced_analytics?.data_quality_score, // "ESTIMATED"
                    trazabilidad_total_invoices: parseInt(item.trazabilidad_total_invoices) || 0,
                    emission_factor_source: item.advanced_analytics?.emission_factor_source
                },

                // Bloque de Inteligencia (Predictive)
                predictive: {
                    current_vs_target_pct: parseFloat(item.predictive_engine?.current_vs_target_pct) || 0,
                    financial_risk_exposure: parseFloat(item.predictive_engine?.financial_risk_exposure) || 0,
                    target_annual_limit: parseFloat(item.predictive_engine?.target_annual_limit) || 0
                },

                // RAW DATA: El objeto original completo por si el front necesita algo más
                sourceData: JSON.stringify(item)
            };
        } catch (error) {
            console.error("Error:", error);
            throw new Error(`Error recuperando KPIs: ${error.message}`);
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