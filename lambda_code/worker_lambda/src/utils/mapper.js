/**
 * Transforms AI results into the final Golden Record.
 * Versión simplificada para STEP 2: Validación de usuario.
 * Se eliminan KPIs de promedios e intensidad hasta el STEP 3.
 */
export const buildGoldenRecord = (orgId, sk, aiAnalysis, emissions, status, category, originalMetadata = {}) => {
    const now = new Date().toISOString();
    
    // 0. NORMALIZACIÓN DE PK
    const cleanPK = orgId.replace("ORG#", "");
    
    console.log(`[MAPPER] [${sk}] Mapping Golden Record for Validation. Target Org: ${cleanPK}`);

    // 1. DATA PREP
    const cleanMetadata = originalMetadata?.M || originalMetadata || {};
    const source = aiAnalysis.source_data || {};
    const billing = source.billing_period || {};
    const technical = aiAnalysis.technical_ids || {}; 

    // 2. BASIC METRIC EXTRACTION (Para soporte de validación)
    const totalAmount = Number(source.total_amount?.total_with_tax || 0);
    
    const totalConsumption = (aiAnalysis.emission_lines || [])
        .filter(line => line.unit?.toLowerCase().includes('kwh'))
        .reduce((sum, line) => sum + (Number(line.value) || 0), 0);

    const mainUnit = aiAnalysis.emission_lines?.find(l => l.unit?.toLowerCase().includes('kwh'))?.unit || "kWh";

    // 3. ANALYTICS MÍNIMO PARA PASO 2
    const unitPrice = totalConsumption > 0 ? (totalAmount / totalConsumption) : 0;
    
    const analytics = {
        confidence_score: aiAnalysis.confidence_score || 0.85,
        anomaly_detected: unitPrice > 0.25 // Alerta si el precio/kWh es inusualmente alto
    };

    // 4. FINAL OBJECT CONSTRUCTION
    return {
        PK: cleanPK,
        SK: sk,
        analytics, 
        ai_analysis: {
            service_type: category || "ELECTRICITY",
            value: totalConsumption,
            unit: mainUnit,
            status_triage: "DONE"
        },
        // Mantenemos la estructura pero vacía si no hay emisiones en este paso
        climatiq_result: emissions && Object.keys(emissions).length > 0 ? {
            co2e: Number(emissions.total_kg || 0),
            co2e_unit: "kg",
            activity_id: emissions.activity_id || "unknown",
            timestamp: now
        } : {},
        extracted_data: {
            invoice_number: source.invoice_number || null,
            invoice_date: source.invoice_date || null,
            vendor: source.vendor?.name || "Unknown",
            customer: source.customer || {},
            
            cups: technical.cups || null,
            contract_reference: technical.contract_reference || null,
            contracted_power: {
                p1: technical.contracted_power_p1 || null,
                p2: technical.contracted_power_p2 || null
            },
            tariff: technical.tariff || null,

            total_amount: totalAmount,
            tax_amount: Number(source.total_amount?.tax_amount || 0),
            net_amount: Number(source.total_amount?.net_amount || 0),
            currency: source.currency || "EUR",
            billing_period: { 
                start: billing.start || null, 
                end: billing.end || null 
            },
            lines: aiAnalysis.emission_lines || [] 
        },
        status: status || "READY_FOR_REVIEW",
        processed_at: now,
        updated_at: now,
        metadata: {
            ...cleanMetadata, 
            s3_key: cleanMetadata.s3_key || null,
            status: status || "READY_FOR_REVIEW",
            is_draft: false
        }
    };
};