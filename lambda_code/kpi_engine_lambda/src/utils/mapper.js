/**
 * Crea el registro definitivo (Golden Record) asegurando la persistencia de metadatos.
 * @param {string} orgId - ID de la organización (PK).
 * @param {string} sk - ID único de la factura (SK).
 * @param {object} aiAnalysis - Resultado del análisis de Bedrock.
 * @param {object} emissions - Resultado del cálculo de Climatiq.
 * @param {string} status - Estado de validación (ej: "VALIDATED").
 * @param {string} category - Categoría detectada (GAS, ELECTRICITY, etc.).
 * @param {object} originalMetadata - Metadatos originales del registro DRAFT (contiene s3_key).
 */
export const buildGoldenRecord = (orgId, sk, aiAnalysis, emissions, status, category, originalMetadata = {}) => {
    // 1. GESTIÓN DE FECHAS Y PRORRATEO
    const billing = aiAnalysis.source_data?.billing_period || {};
    const start = billing.start ? new Date(billing.start) : new Date();
    const end = billing.end ? new Date(billing.end) : new Date();
    
    let days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (isNaN(days) || days <= 0) days = 1;

    // 2. EXTRACCIÓN DE MÉTRICAS (Seguridad contra valores nulos)
    const finalCo2 = Number(emissions?.total_kg || emissions?.co2e || 0);
    const totalConsumption = (aiAnalysis.emission_lines || [])
        .reduce((sum, line) => sum + (Number(line.value) || 0), 0);

    // 3. LIMPIEZA DE METADATOS (EL CORAZÓN DEL FIX)
    // Extraemos el contenido real si viene envuelto en el formato de DynamoDB (.M)
    const cleanMetadata = originalMetadata?.M || originalMetadata;

    // 4. CONSTRUCCIÓN DEL OBJETO FINAL
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
            co2e: finalCo2,
            co2e_unit: "kg",
            activity_id: emissions?.activity_id || "unknown",
            timestamp: new Date().toISOString()
        },
        extracted_data: {
            vendor: aiAnalysis.source_data?.vendor?.name || "Unknown",
            total_amount: Number(aiAnalysis.source_data?.total_amount?.total_with_tax || 0),
            currency: aiAnalysis.source_data?.currency || "EUR",
            billing_period: { 
                start: billing.start, 
                end: billing.end 
            }
        },
        total_days_prorated: days,
        status: "DONE", // Estado de negocio para filtros rápidos
        processed_at: new Date().toISOString(),
        metadata: {
            // Esparcimos todos los metadatos originales (aquí vive s3_key, facility_id, etc.)
            ...cleanMetadata, 
            // Sobrescribimos/Actualizamos solo los campos de control del pipeline
            status: status,
            processed_at: new Date().toISOString(),
            is_draft: false
        }
    };
};