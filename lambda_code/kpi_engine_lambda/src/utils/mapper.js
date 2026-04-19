export const buildGoldenRecord = (orgId, sk, aiAnalysis, emissions, status, category) => {
    // 1. Extraer fechas de la ruta correcta: source_data.billing_period
    const billing = aiAnalysis.source_data?.billing_period || {};
    const rawStart = billing.start;
    const rawEnd = billing.end;

    // Validación defensiva para evitar el crash de "Invalid Date"
    const start = rawStart ? new Date(rawStart) : new Date();
    const end = rawEnd ? new Date(rawEnd) : new Date();
    
    let days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (isNaN(days) || days <= 0) days = 1; // Fallback para que nSpend no sea Infinity

    // 2. Calcular el valor de consumo (Value)
    // Tu prompt genera 'emission_lines'. Sumamos los 'value' de esas líneas.
    const totalConsumption = (aiAnalysis.emission_lines || [])
        .reduce((sum, line) => sum + (Number(line.value) || 0), 0);

    return {
        PK: orgId,
        SK: sk,
        // ESTRUCTURA PARA ESTADÍSTICAS (Lo que lee el DB Stream)
        ai_analysis: {
            service_type: category || aiAnalysis.analytics_metadata?.category || "UNKNOWN",
            value: totalConsumption, 
            unit: aiAnalysis.emission_lines?.[0]?.unit || "units",
            status_triage: "DONE"
        },
        climatiq_result: {
            co2e: Number(emissions?.total_kg || 0), // Viene del pipeline
            co2e_unit: "kg",
            timestamp: new Date().toISOString()
        },
        // ESTRUCTURA PARA EL FRONTEND/DYNAMO
        extracted_data: {
            vendor: aiAnalysis.source_data?.vendor?.name || "Unknown",
            vendor_tax_id: aiAnalysis.source_data?.vendor?.tax_id,
            invoice_number: aiAnalysis.source_data?.invoice_number,
            total_amount: Number(aiAnalysis.source_data?.total_amount?.total_with_tax || 0),
            currency: aiAnalysis.source_data?.currency || "EUR",
            billing_period: {
                start: rawStart,
                end: rawEnd
            },
            lines: aiAnalysis.emission_lines || []
        },
        total_days_prorated: days, 
        metadata: {
            status: status,
            processed_at: new Date().toISOString(),
            audit_thought: aiAnalysis.audit_thought_process?.monetary_vs_physical_check
        }
    };
};