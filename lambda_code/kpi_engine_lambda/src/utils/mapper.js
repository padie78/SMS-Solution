/**
 * Crea el registro definitivo (Golden Record) con KPIs de Energy Intelligence.
 */
export const buildGoldenRecord = (orgId, sk, aiAnalysis, emissions, status, category, originalMetadata = {}) => {
    // 1. GESTIÓN DE FECHAS Y PRORRATEO
    const billing = aiAnalysis.source_data?.billing_period || {};
    const start = billing.start ? new Date(billing.start) : new Date();
    const end = billing.end ? new Date(billing.end) : new Date();
    
    let days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (isNaN(days) || days <= 0) days = 1;

    // 2. EXTRACCIÓN DE MÉTRICAS BASE
    const totalAmount = Number(aiAnalysis.source_data?.total_amount?.total_with_tax || 0);
    const finalCo2 = Number(emissions?.total_kg || emissions?.co2e || 0);
    const totalConsumption = (aiAnalysis.emission_lines || [])
        .reduce((sum, line) => sum + (Number(line.value) || 0), 0);

    // 3. CÁLCULO DE KPIs (ENERGY INTELLIGENCE)
    // Usamos Number.EPSILON para evitar divisiones por cero y errores de punto flotante
    const analytics = {
        // ¿Cuánto pago por cada kWh? (Detecta subas de tarifas)
        unit_price_index: totalConsumption > 0 ? (totalAmount / totalConsumption).toFixed(4) : "0",
        
        // ¿Qué tan "sucia" es mi energía? (kgCO2 por cada kWh)
        carbon_intensity: totalConsumption > 0 ? (finalCo2 / totalConsumption).toFixed(4) : "0",
        
        // Normalización Diaria (Para comparar meses de 28 vs 31 días)
        daily_avg_consumption: (totalConsumption / days).toFixed(2),
        daily_avg_cost: (totalAmount / days).toFixed(2),
        
        // Score de Calidad de Datos (Confianza de la IA)
        confidence_score: aiAnalysis.confidence_score || 0
    };

    // 4. LIMPIEZA DE METADATOS
    const cleanMetadata = originalMetadata?.M || originalMetadata;

    // 5. CONSTRUCCIÓN DEL OBJETO FINAL
    return {
        PK: orgId,
        SK: sk,
        // Nodo de inteligencia para el Frontend y reportes ESG
        analytics, 
        ai_analysis: {
            service_type: category || aiAnalysis.analytics_metadata?.category || "ELECTRICITY",
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