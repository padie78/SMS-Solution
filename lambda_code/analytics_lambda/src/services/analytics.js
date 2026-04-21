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
        // 1. Construcción de SK (Jerarquía: STATS#2026#Q2#M04#D01)
        const year = args.year || "2026";
        const { quarter, month, day } = args;

        let skParts = ['STATS', year];
        if (quarter) skParts.push(quarter.toUpperCase());
        if (month) skParts.push(`M${month.toString().padStart(2, '0')}`);
        if (day) skParts.push(`D${day.toString().padStart(2, '0')}`);
        const finalSK = skParts.join('#');

        try {
            const item = await repo.getStats(orgId, finalSK);
            if (!item) return null;

            // 2. Retorno de Objeto Enriquecido (Full Context)
            return {
                id: item.SK,
                metadata: {
                    orgId,
                    timestamp: new Date().toISOString(),
                    period: { year, quarter, month, day },
                    status: item.status || "DRAFT"
                },

                // --- BLOQUE 1: FINANCIERO & COSTOS ---
                financials: {
                    totalSpend: item.financials_total_spend || 0,
                    currency: item.financials_currency || "USD",
                    // Pregunta #15: Costo por m2
                    costPerM2: item.building_info?.m2 ? (item.financials_total_spend / item.building_info.m2) : 0,
                    // Pregunta #17 & #18: Ahorros y Procrastinación
                    savingsRealized: item.ai_analysis?.savings_realized || 0,
                    savingsPending: item.ai_analysis?.pending_recommendations_value || 0,
                    taxProjections: item.transition_risk_scoring || {}
                },

                // --- BLOQUE 2: ENERGÍA & INTENSIDAD ---
                energy: {
                    consumptionKwh: item.consumption_val || 0,
                    // Pregunta #3 & #6: Benchmarking e Intensidad
                    intensityIndex: item.analytics?.energy_intensity || 0,
                    renewableMix: item.renewable_energy_mix_pct || 0,
                    // Pregunta #14 & #22: Desperdicio
                    phantomLoadKwh: item.analytics?.phantom_load || 0,
                    idleWasteCost: item.analytics?.idle_energy_cost || 0
                },

                // --- BLOQUE 3: SOSTENIBILIDAD & ESG ---
                sustainability: {
                    totalCo2e: item.ghg_total_co2e_kg || 0,
                    emissionFactor: item.factor_identity?.co2e_value || 0,
                    // Pregunta #19: Brecha Net Zero
                    netZeroGap: item.sustainability_standards?.net_zero_progress_pct || 0,
                    complianceStatus: item.regulatory_compliance?.status || "COMPLIANT"
                },

                // --- BLOQUE 4: OPERATIVO & CALIDAD ---
                operational: {
                    // Pregunta #9 & #24: Integridad
                    dataQualityScore: item.data_quality_score || "ESTIMATED",
                    reliabilityPct: item.audit_trail?.reliability_score || 0,
                    // Pregunta #7: Salud de Red
                    gridHealthEvents: item.metrology?.grid_incidents_count || 0,
                    avgVoltageDrift: item.metrology?.voltage_drift || 0
                },

                // --- BLOQUE 5: DESGLOSE (Para Gráficas de Tarta en Svelte) ---
                breakdown: {
                    byService: item.breakdown_service || {}, // HVAC, Lighting, etc.
                    bySource: item.breakdown_source || {}    // Grid, Solar, GenSet
                }
            };
        } catch (error) {
            throw new Error(`Error en el análisis descriptivo: ${error.message}`);
        }
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