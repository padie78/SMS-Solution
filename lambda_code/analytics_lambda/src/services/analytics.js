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
        const { quarter, month, week, day } = args;

        // 1. Construcción de SK Aditiva (STATS#2026#Q2#M04)
        let skParts = ['STATS', year];
        if (quarter) {
            skParts.push(quarter.toUpperCase());
        } else if (month) {
            const q = Math.ceil(parseInt(month) / 3);
            skParts.push(`Q${q}`);
        }

        if (month) {
            skParts.push(`M${month.toString().padStart(2, '0')}`);
            if (day) skParts.push(`D${day.toString().padStart(2, '0')}`);
        } else if (week) {
            skParts.push(`W${week.toString().padStart(2, '0')}`);
        }

        const finalSK = skParts.join('#');

        try {
            const item = await repo.getStats(orgId, finalSK);
            if (!item) return null;

            // 2. Mapeo usando los campos REALES de tu base de datos
            return {
                id: item.SK,
                metadata: {
                    orgId,
                    year,
                    quarter: item.SK.split('#')[2] || null,
                    month,
                    week,
                    granularity: month ? "MONTHLY" : "YEARLY",
                    lastUpdated: item.last_updated,
                    version: item.metadata?.version || "1.2"
                },

                financials: {
                    totalSpend: parseFloat(item.financials_total_spend) || 0,
                    currency: "USD", // Hardcoded según tu BD
                    costPerM2: 0, // Requiere dato de superficie externa
                    savingsRealized: 0,
                    // Usamos el riesgo financiero del motor predictivo
                    savingsPending: parseFloat(item.predictive_engine?.financial_risk_exposure) || 0,
                    // Exponemos los escenarios de impuestos al carbono en el JSON de riesgo
                    taxRiskExposure: JSON.stringify(item.advanced_analytics?.transition_risk_scoring)
                },

                energy: {
                    // Mapeo directo de gas_val (puedes sumar elec_val si aparece luego)
                    consumptionKwh: parseFloat(item.consumption_gas_val) || 0,
                    // Campo exacto: energy_intensity_index
                    intensityIndex: parseFloat(item.advanced_analytics?.energy_intensity_index) || 0,
                    phantomLoadKwh: 0, // No disponible en este item
                    idleEnergyCost: 0
                },

                sustainability: {
                    // Conversión: Toneladas a Kg (0.219397 -> 219.39)
                    totalCo2eKg: (parseFloat(item.ghg_total_co2e_ton) || 0) * 1000,
                    // Intensidad de carbono sobre ingresos (del management_reporting)
                    carbonIntensity: parseFloat(item.management_reporting?.carbon_intensity_revenue) || 0,
                    renewableRatio: parseFloat(item.advanced_analytics?.renewable_energy_mix_pct) || 0,
                    // Brecha hacia el target (del predictive_engine)
                    netZeroGapPct: parseFloat(item.predictive_engine?.current_vs_target_pct) || 0,
                    complianceStatus: item.management_reporting?.reporting_period_status === "OPEN" ? "PENDING" : "COMPLIANT",
                    weatherNormalizedUsage: 0
                },

                operational: {
                    // Conversión de String "ESTIMATED" a valor numérico 0-100
                    dataQualityScore: item.advanced_analytics?.data_quality_score === "ESTIMATED" ? 75.0 : 100.0,
                    reliabilityPct: item.audit_trail ? 90.0 : 0, 
                    // Usamos el conteo de facturas como proxy de incidentes o actividad
                    gridHealthIncidents: parseInt(item.trazabilidad_total_invoices) || 0 
                },

                breakdowns: {
                    byService: {
                        elec_spend: 0,
                        elec_val: 0,
                        gas_spend: parseFloat(item.consumption_gas_spend) || 0,
                        gas_val: parseFloat(item.consumption_gas_val) || 0,
                        hvac_val: 0,
                        lighting_val: 0,
                        other_val: 0
                    },
                    // Guardamos el motor de cálculo usado como metadata de origen
                    bySource: JSON.stringify({ engine: item.audit_trail?.[0]?.engine })
                }
            };
        } catch (error) {
            console.error("Error en getPrecalculatedKPI:", error);
            throw new Error(`Error mapeando campos de BD: ${error.message}`);
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