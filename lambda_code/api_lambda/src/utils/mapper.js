/**
 * Crea el registro definitivo (Golden Record) alineado con ISO 50001 y GHG Protocol.
 */
export const buildGoldenRecord = (orgId, sk, aiAnalysis, emissions, status, category, originalMetadata = {}) => {
    // 1. LIMPIEZA DE METADATOS (Fundamental para extraer m2)
    const cleanMetadata = originalMetadata?.M || originalMetadata;
    
    // Extraemos m2 de los metadatos (fallback a 0 para evitar el ReferenceError)
    const facilityM2 = Number(cleanMetadata.facility_m2?.N || cleanMetadata.facility_m2 || 0);

    // 2. GESTIÓN DE FECHAS Y PRORRATEO
    const billing = aiAnalysis.source_data?.billing_period || {};
    const start = billing.start ? new Date(billing.start) : new Date();
    const end = billing.end ? new Date(billing.end) : new Date();
    
    let days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (isNaN(days) || days <= 0) days = 1;

    // 3. EXTRACCIÓN DE MÉTRICAS BASE
    const totalAmount = Number(aiAnalysis.source_data?.total_amount?.total_with_tax || 0);
    const finalCo2 = Number(emissions?.total_kg || emissions?.co2e || 0);
    const totalConsumption = (aiAnalysis.emission_lines || [])
        .reduce((sum, line) => sum + (Number(line.value) || 0), 0);

    // 4. LÓGICA DE NEGOCIO Y ANOMALÍAS
    const unitPrice = totalConsumption > 0 ? (totalAmount / totalConsumption) : 0;
    const REFERENCE_PRICE = 0.15; // Este valor podrías parametrizarlo luego por ORG
    const isAnomaly = unitPrice > (REFERENCE_PRICE * 1.2); 

    // 5. CÁLCULO DE KPIs (Standards Compliant)
    const analytics = {
        // Eficiencia Operativa (Normalización temporal)
        daily_avg_consumption: (totalConsumption / days).toFixed(2),
        daily_avg_cost: (totalAmount / days).toFixed(2),

        // ISO 50001: Intensidad Energética (Solo si tenemos metros cuadrados)
        energy_intensity_m2: facilityM2 > 0 ? (totalConsumption / facilityM2).toFixed(2) : null,
        
        // GHG Protocol: Intensidad de Carbono (kgCO2e/kWh)
        carbon_intensity: totalConsumption > 0 ? (finalCo2 / totalConsumption).toFixed(4) : "0",
        
        // Indicador Financiero: Unit Price Index
        unit_price_index: unitPrice.toFixed(4),
        
        // Control de Calidad y Fraude
        confidence_score: aiAnalysis.confidence_score || 0.85,
        anomaly_detected: isAnomaly
    };

    // 6. CONSTRUCCIÓN DEL OBJETO FINALf
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
            processed_at: isoNow(), // Helper de fecha o new Date().toISOString()
            is_draft: false
        }
    };
};

// Helper interno para evitar duplicidad de lógica de fechas
const isoNow = () => new Date().toISOString();