export const buildGoldenRecord = (orgId, sk, aiAnalysis, emissions, status, category) => {
    // 1. Días de prorrateo (Cálculo vital para las estadísticas)
    const start = new Date(aiAnalysis.extracted_data?.billing_period?.start);
    const end = new Date(aiAnalysis.extracted_data?.billing_period?.end);
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);

    return {
        PK: orgId,
        SK: sk, // Mantienes el SK original de la factura
        ai_analysis: {
            service_type: category || aiAnalysis.category,
            // Usamos el valor neto de consumo para las estadísticas físicas (vCons)
            value: aiAnalysis.total_magnitude_sum || 0, 
            unit: aiAnalysis.unit || "kWh",
            status_triage: "DONE"
        },
        climatiq_result: {
            // AQUÍ INTEGRAS LOS DATOS DE CLIMATIQ QUE ANTES FALTABAN
            co2e: emissions.total_kg || 0, 
            co2e_unit: "kg",
            timestamp: new Date().toISOString()
        },
        extracted_data: {
            ...aiAnalysis.extracted_data,
            // Aseguramos que el total_amount esté disponible para nSpend
            total_amount: aiAnalysis.extracted_data?.total_amount || 0
        },
        total_days_prorated: days, // <--- AQUÍ REPARAS EL "0"
        metadata: {
            status: status,
            processed_at: new Date().toISOString()
        }
    };
};