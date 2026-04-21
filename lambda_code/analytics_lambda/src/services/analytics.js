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

        // --- 1. CONSTRUCCIÓN DE SK ADITIVA ---
        let skParts = ['STATS', year];
        
        // Manejo de Quarter (automático si hay mes)
        if (quarter) {
            skParts.push(quarter.toUpperCase());
        } else if (month) {
            const calculatedQ = Math.ceil(parseInt(month) / 3);
            skParts.push(`Q${calculatedQ}`);
        }

        // Manejo de Mes y Día
        if (month) {
            skParts.push(`M${month.toString().padStart(2, '0')}`);
            if (day) {
                skParts.push(`D${day.toString().padStart(2, '0')}`);
            }
        } 
        // Manejo de Semana (Independiente)
        else if (week) {
            skParts.push(`W${week.toString().padStart(2, '0')}`);
        }

        const finalSK = skParts.join('#');
        console.log(`[DEBUG] Querying DynamoDB -> Org: ${orgId} | SK: ${finalSK}`);

        try {
            const item = await repo.getStats(orgId, finalSK);
            if (!item) return null;

            // --- 2. RETORNO CON PASSTHROUGH (sourceData) ---
            return {
                id: item.SK,
                metadata: {
                    orgId,
                    year,
                    quarter: item.SK.split('#')[2] || null,
                    month: month || null,
                    week: week || null,
                    day: day || null,
                    granularity: week ? "WEEKLY" : (day ? "DAILY" : (month ? "MONTHLY" : (quarter ? "QUARTERLY" : "YEARLY"))),
                    lastUpdated: item.last_updated || new Date().toISOString()
                },

                // INYECCIÓN CRUDA: El cliente recibe el objeto de la BD tal cual lo posteaste
                sourceData: JSON.stringify(item),

                // MAPEOS MÍNIMOS: Solo para asegurar que los componentes base del Dashboard funcionen
                financials: {
                    totalSpend: parseFloat(item.financials_total_spend) || 0,
                    currency: "USD",
                    savingsPending: parseFloat(item.predictive_engine?.financial_risk_exposure) || 0,
                    taxRiskExposure: JSON.stringify(item.advanced_analytics?.transition_risk_scoring)
                },
                energy: {
                    consumptionKwh: parseFloat(item.consumption_gas_val) || 0,
                    intensityIndex: parseFloat(item.advanced_analytics?.energy_intensity_index) || 0
                },
                sustainability: {
                    totalCo2eKg: (parseFloat(item.ghg_total_co2e_ton) || 0) * 1000, // Ton a Kg
                    complianceStatus: item.management_reporting?.reporting_period_status === "OPEN" ? "PENDING" : "COMPLIANT"
                },
                operational: {
                    dataQualityScore: item.advanced_analytics?.data_quality_score === "ESTIMATED" ? 75.0 : 100.0,
                    gridHealthIncidents: parseInt(item.trazabilidad_total_invoices) || 0
                }
            };
        } catch (error) {
            console.error(`[ERROR] Analytics: ${error.message}`);
            throw new Error(`Error mapeando el Energy Efficiency System: ${error.message}`);
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