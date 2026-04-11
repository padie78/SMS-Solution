/**
 * Lógica de negocio para KPIs de Sostenibilidad
 */
export const calculateSMSMetrics = (metrics, orgSettings) => {
    const { nCo2e, vCons } = metrics;
    const { 
        total_revenue = 1, // Evitar división por cero
        sq_meters = 1, 
        renewable_kwh_produced = 0,
        heating_degree_days = 1 
    } = orgSettings;

    const co2Ton = nCo2e / 1000;

    return {
        normalization: {
            intensity_per_revenue: Number((co2Ton / (total_revenue / 1000000)).toFixed(4)), // tCO2e / $M
            intensity_per_sqm: Number((vCons / sq_meters).toFixed(2)) // kWh / m2
        },
        environmental: {
            renewable_energy_ratio: Number((renewable_kwh_produced / vCons).toFixed(2)),
            avoided_emissions_ton: Number(((renewable_kwh_produced * 0.4) / 1000).toFixed(4)) // Factor carbón evitado
        },
        weather: {
            weather_normalized_usage: Number((vCons / heating_degree_days).toFixed(2))
        }
    };
};