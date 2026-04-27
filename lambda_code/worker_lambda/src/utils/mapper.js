/**
 * Transforma los resultados de IA y Emisiones en el registro final (Golden Record).
 * Adaptado para el flujo de Worker SQS.
 */
export const buildGoldenRecord = (orgId, sk, aiAnalysis, emissions, status, category, originalMetadata = {}) => {
    // 1. LIMPIEZA DE METADATOS
    // Si viene de DynamoDB Stream puede traer .M, si viene de SQS/JS suele ser plano.
    const cleanMetadata = originalMetadata?.M || originalMetadata || {};
    
    const facilityM2 = Number(cleanMetadata.facility_m2?.N || cleanMetadata.facility_m2 || 0);

    // 2. GESTIÓN DE FECHAS Y PRORRATEO
    const billing = aiAnalysis.source_data?.billing_period || {};
    const start = billing.start ? new Date(billing.start) : new Date();
    const end = billing.end ? new Date(billing.end) : new Date();
    
    let days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (isNaN(days) || days <= 0) days = 1;

    // 3. EXTRACCIÓN DE MÉTRICAS BASE
    // Usamos el total con impuestos que extrajo Bedrock
    const totalAmount = Number(aiAnalysis.source_data?.total_amount?.total_with_tax || 0);
    const finalCo2 = Number(emissions?.total_kg || emissions?.co2e || 0);
    
    // Sumamos el consumo de todas las líneas (kWh, m3, etc)
    const totalConsumption = (aiAnalysis.emission_lines || [])
        .reduce((sum, line) => sum + (Number(line.value) || 0), 0);

    // 4. LÓGICA DE ANOMALÍAS
    const unitPrice = totalConsumption > 0 ? (totalAmount / totalConsumption) : 0;
    const REFERENCE_PRICE = 0.15; 
    const isAnomaly = unitPrice > (REFERENCE_PRICE * 1.2); 

    // 5. CÁLCULO DE KPIs (Capa Analytics)
    const analytics = {
        daily_avg_consumption: Number((totalConsumption / days).toFixed(2)),
        daily_avg_cost: Number((totalAmount / days).toFixed(2)),
        energy_intensity_m2: facilityM2 > 0 ? Number((totalConsumption / facilityM2).toFixed(2)) : null,
        carbon_intensity: totalConsumption > 0 ? Number((finalCo2 / totalConsumption).toFixed(4)) : 0,
        unit_price_index: Number(unitPrice.toFixed(4)),
        confidence_score: aiAnalysis.confidence_score || 0.85,
        anomaly_detected: isAnomaly
    };

    // 6. CONSTRUCCIÓN DEL OBJETO FINAL
    const now = new Date().toISOString();

    return {
        PK: orgId,
        SK: sk,
        analytics, 
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
            timestamp: now
        },
        extracted_data: {
            vendor: aiAnalysis.source_data?.vendor?.name || "Unknown",
            total_amount: totalAmount,
            currency: aiAnalysis.source_data?.currency || "EUR",
            billing_period: { 
                start: billing.start || null, 
                end: billing.end || null 
            }
        },
        total_days_prorated: days,
        status: status,
        processed_at: now,
        metadata: {
            ...cleanMetadata, 
            status: status || "VALIDATED",
            processed_at: now, // CORRECCIÓN: Usamos la variable 'now'
            is_draft: false
        }
    };
};