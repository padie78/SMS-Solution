export const buildGoldenRecord = (orgId, sk, aiAnalysis, emissions, status, category) => {
    // 1. Extraer Fechas (Ruta: source_data.billing_period)
    const billing = aiAnalysis.source_data?.billing_period || {};
    const rawStart = billing.start;
    const rawEnd = billing.end;

    const start = rawStart ? new Date(rawStart) : new Date();
    const end = rawEnd ? new Date(rawEnd) : new Date();
    
    let days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (isNaN(days) || days <= 0) days = 1;

    // 2. Extraer CO2 (Usamos total_kg que es lo que viene en tu log)
    const co2Val = Number(emissions?.total_kg || 0);

    // 3. Consumo Físico (Suma de las líneas de Bedrock)
    const totalConsumption = (aiAnalysis.emission_lines || [])
        .reduce((sum, line) => sum + (Number(line.value) || 0), 0);

    return {
        PK: orgId,
        SK: sk,
        // ESTO ES LO QUE LEE EL DB STREAM PARA LAS ESTADÍSTICAS
        ai_analysis: {
            service_type: category || aiAnalysis.analytics_metadata?.category || "ELECTRICITY",
            value: totalConsumption,
            unit: aiAnalysis.emission_lines?.[0]?.unit || "kWh",
            status_triage: "DONE"
        },
        // ESTO ES LO QUE TE FALTABA
        climatiq_result: {
            co2e: co2Val, 
            co2e_unit: "kg",
            activity_id: emissions?.activity_id || "unknown",
            timestamp: new Date().toISOString()
        },
        extracted_data: {
            vendor: aiAnalysis.source_data?.vendor?.name || "Unknown",
            total_amount: Number(aiAnalysis.source_data?.total_amount?.total_with_tax || 0),
            currency: aiAnalysis.source_data?.currency || "EUR",
            billing_period: { start: rawStart, end: rawEnd }
        },
        total_days_prorated: days,
        metadata: {
            status: status,
            processed_at: new Date().toISOString()
        }
    };
};