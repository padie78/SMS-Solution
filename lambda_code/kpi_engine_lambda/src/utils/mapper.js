export const buildGoldenRecord = (orgId, sk, aiAnalysis, emissions, status, category, originalMetadata = {}) => {
    const billing = aiAnalysis.source_data?.billing_period || {};
    const start = billing.start ? new Date(billing.start) : new Date();
    const end = billing.end ? new Date(billing.end) : new Date();
    
    let days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (isNaN(days) || days <= 0) days = 1;

    const totalAmount = Number(aiAnalysis.source_data?.total_amount?.total_with_tax || 0);
    const finalCo2 = Number(emissions?.total_kg || emissions?.co2e || 0);
    const totalConsumption = (aiAnalysis.emission_lines || [])
        .reduce((sum, line) => sum + (Number(line.value) || 0), 0);

    // Lógica de Anomalía: Precio de referencia (ej: 0.15 EUR/kWh)
    const unitPrice = totalConsumption > 0 ? (totalAmount / totalConsumption) : 0;
    const REFERENCE_PRICE = 0.15; 
    const isAnomaly = unitPrice > (REFERENCE_PRICE * 1.2); // +20% sobre referencia

  const analytics = {
        unit_price_index: unitPrice.toFixed(4),
        carbon_intensity: totalConsumption > 0 ? (finalCo2 / totalConsumption).toFixed(4) : "0",
        daily_avg_cost: (totalAmount / days).toFixed(2),
        // KPI ISO 50001: Intensidad por superficie (si tienes el dato en el perfil de la empresa)
    energy_intensity_m2: facility_m2 > 0 ? (totalConsumption / facility_m2).toFixed(2) : null,
    
    // KPI Financiero: Costo unitario normalizado
    unit_price_index: totalConsumption > 0 ? (totalAmount / totalConsumption).toFixed(4) : "0",
    
    // KPI Sostenibilidad: Factor de emisión real capturado
    carbon_intensity: totalConsumption > 0 ? (finalCo2 / totalConsumption).toFixed(4) : "0",
    
    // Normalización temporal (Estándar para prorrateos)
    daily_avg_consumption: (totalConsumption / days).toFixed(2),
    
    // Detección de Anomalías (Lógica de control de varianza)
    anomaly_detected: unitPrice > (REFERENCE_PRICE * 1.2),
    
    // Calidad del dato para auditoría
    data_quality_score: aiAnalysis.confidence_score || 0.85,
        
        // CORRECCIÓN AQUÍ: Intentamos varias rutas comunes
        confidence_score: aiAnalysis.confidence_score || 
                          aiAnalysis.metadata?.confidence || 
                          aiAnalysis.analysis_metadata?.confidence_score || 
                          0.85, // Fallback a 0.85 si el análisis fue exitoso pero no envió score
        
        anomaly_detected: isAnomaly
    };

    const cleanMetadata = originalMetadata?.M || originalMetadata;

    return {
        PK: orgId,
        SK: sk,
        analytics, // Inyectado aquí
        ai_analysis: {
            service_type: category || "ELECTRICITY",
            value: totalConsumption,
            unit: aiAnalysis.emission_lines?.[0]?.unit || "kWh",
            status_triage: "DONE"
        },
        climatiq_result: {
            co2e: finalCo2,
            co2e_unit: "kg",
            activity_id: emissions?.activity_id || "unknown",
            timestamp: new Date().toISOString()
        },
        extracted_data: {
            vendor: aiAnalysis.source_data?.vendor?.name || "Unknown",
            total_amount: totalAmount,
            currency: aiAnalysis.source_data?.currency || "EUR",
            billing_period: { start: billing.start, end: billing.end }
        },
        total_days_prorated: days,
        status: "DONE",
        processed_at: new Date().toISOString(),
        metadata: {
            ...cleanMetadata, 
            status: status,
            processed_at: new Date().toISOString(),
            is_draft: false
        }
    };
};