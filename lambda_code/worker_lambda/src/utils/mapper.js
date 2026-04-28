/**
 * Transforms AI results into the final Golden Record.
 * Adapted to handle skipped emissions (Climatiq) and provide clean data for the UI.
 */
export const buildGoldenRecord = (orgId, sk, aiAnalysis, emissions, status, category, originalMetadata = {}) => {
    const now = new Date().toISOString();
    console.log(`[MAPPER] [${sk}] Mapping Golden Record. Target Org: ${orgId}`);

    // 1. METADATA SANITIZATION
    const cleanMetadata = originalMetadata?.M || originalMetadata || {};
    const facilityM2 = Number(cleanMetadata.facility_m2?.N || cleanMetadata.facility_m2 || 0);

    // 2. DATE & PRORATION MANAGEMENT
    const billing = aiAnalysis.source_data?.billing_period || {};
    const startDate = billing.start ? new Date(billing.start) : new Date();
    const endDate = billing.end ? new Date(billing.end) : new Date();
    
    const diffTime = Math.abs(endDate - startDate);
    let days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (isNaN(days) || days <= 0) days = 1;

    // 3. METRIC EXTRACTION
    const totalAmount = Number(aiAnalysis.source_data?.total_amount?.total_with_tax || 0);
    
    // SAFE CHECK: If emissions are skipped, we default to 0
    const finalCo2 = Number(emissions?.total_kg || emissions?.co2e || 0);
    
    const totalConsumption = (aiAnalysis.emission_lines || [])
        .reduce((sum, line) => sum + (Number(line.value) || 0), 0);

    // 4. ANOMALY DETECTION LOGIC
    const unitPrice = totalConsumption > 0 ? (totalAmount / totalConsumption) : 0;
    const REFERENCE_PRICE = 0.15; 
    const isAnomaly = unitPrice > (REFERENCE_PRICE * 1.2); 

    // 5. ANALYTICS KPI GENERATION
    const analytics = {
        daily_avg_consumption: Number((totalConsumption / days).toFixed(2)),
        daily_avg_cost: Number((totalAmount / days).toFixed(2)),
        energy_intensity_m2: facilityM2 > 0 ? Number((totalConsumption / facilityM2).toFixed(2)) : null,
        // If finalCo2 is 0, carbon_intensity will be 0 safely
        carbon_intensity: totalConsumption > 0 ? Number((finalCo2 / totalConsumption).toFixed(4)) : 0,
        unit_price_index: Number(unitPrice.toFixed(4)),
        confidence_score: aiAnalysis.confidence_score || 0.85,
        anomaly_detected: isAnomaly
    };

    // 6. FINAL OBJECT CONSTRUCTION
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
        /**
         * ✅ ADAPTED: Returns an empty object if no emissions data is present.
         * This prevents the UI from showing "Unknown" or outdated calculation fields.
         */
        climatiq_result: emissions && Object.keys(emissions).length > 0 ? {
            co2e: finalCo2,
            co2e_unit: "kg",
            activity_id: emissions.activity_id || "unknown",
            timestamp: now
        } : {},
        extracted_data: {
            vendor: aiAnalysis.source_data?.vendor?.name || "Unknown",
            total_amount: totalAmount,
            currency: aiAnalysis.source_data?.currency || "EUR",
            billing_period: { 
                start: billing.start || null, 
                end: billing.end || null 
            },
            // ✅ CRITICAL: Added for UI Table rendering
            lines: aiAnalysis.emission_lines || [] 
        },
        total_days_prorated: days,
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