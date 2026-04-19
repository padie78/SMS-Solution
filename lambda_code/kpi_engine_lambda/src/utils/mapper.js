export const buildGoldenRecord = (orgId, sk, aiAnalysis, emissions, status, category) => {
    // 1. Fechas y Días
    const billing = aiAnalysis.source_data?.billing_period || {};
    const start = billing.start ? new Date(billing.start) : new Date();
    const end = billing.end ? new Date(billing.end) : new Date();
    
    let days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (isNaN(days) || days <= 0) days = 1;

    // 2. Extraer CO2 (Prioridad total_kg que es lo que manda tu log de Climatiq)
    const finalCo2 = Number(
        emissions?.total_kg || 
        emissions?.co2e || 
        (emissions?.items && emissions.items[0]?.co2e) || 
        0
    );

    // 3. Consumo Físico
    const totalConsumption = (aiAnalysis.emission_lines || [])
        .reduce((sum, line) => sum + (Number(line.value) || 0), 0);

    return {
        PK: orgId,
        SK: sk,
        ai_analysis: {
            service_type: category || aiAnalysis.analytics_metadata?.category || "ELECTRICITY",
            value: totalConsumption,
            unit: aiAnalysis.emission_lines?.[0]?.unit || "kWh",
            status_triage: "DONE"
        },
        climatiq_result: {
            co2e: finalCo2, // <--- Este es el campo que usaremos
            co2e_unit: "kg",
            activity_id: emissions?.activity_id || "unknown",
            timestamp: new Date().toISOString()
        },
        extracted_data: {
            vendor: aiAnalysis.source_data?.vendor?.name || "Unknown",
            total_amount: Number(aiAnalysis.source_data?.total_amount?.total_with_tax || 0),
            currency: aiAnalysis.source_data?.currency || "EUR",
            billing_period: { start: billing.start, end: billing.end }
        },
        total_days_prorated: days,
        metadata: {
            status: status,
            processed_at: new Date().toISOString()
        }
    };
};