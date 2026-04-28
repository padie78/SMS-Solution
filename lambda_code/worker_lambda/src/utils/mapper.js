export const buildGoldenRecord = (orgId, sk, aiAnalysis, emissions, status, category, originalMetadata = {}) => {
    const now = new Date().toISOString();
    
    // NORMALIZACIÓN DE PK: Aseguramos el UUID limpio (sin prefijo ORG#)
    const cleanPK = orgId.replace("ORG#", "");
    
    console.log(`[MAPPER] [${sk}] Mapping Golden Record. Target Org: ${cleanPK}`);

    // 1. METADATA & ANALYTICS PREP
    const cleanMetadata = originalMetadata?.M || originalMetadata || {};
    const facilityM2 = Number(cleanMetadata.facility_m2?.N || cleanMetadata.facility_m2 || 0);

    const source = aiAnalysis.source_data || {};
    const billing = source.billing_period || {};
    const startDate = billing.start ? new Date(billing.start) : new Date();
    const endDate = billing.end ? new Date(billing.end) : new Date();
    
    const diffTime = Math.abs(endDate - startDate);
    let days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (isNaN(days) || days <= 0) days = 1;

    // 2. METRIC EXTRACTION (FILTERING ENERGY FROM POWER)
    const amountData = source.total_amount || {};
    const totalAmount = Number(amountData.total_with_tax || 0);
    const taxAmount = Number(amountData.tax_amount || 0);
    const netAmount = Number(amountData.net_amount || amountData.net || 0);
    
    const finalCo2 = Number(emissions?.total_kg || emissions?.co2e || 0);
    
    // Solo sumamos los valores cuya unidad sea kWh (energía) para el KPI principal de consumo
    const totalConsumption = (aiAnalysis.emission_lines || [])
        .filter(line => line.unit?.toLowerCase().includes('kwh'))
        .reduce((sum, line) => sum + (Number(line.value) || 0), 0);

    // Unidad principal para el header (kWh)
    const mainUnit = aiAnalysis.emission_lines?.find(l => l.unit?.toLowerCase().includes('kwh'))?.unit || "kWh";

    // 3. ANOMALY DETECTION (Unit Price based on Energy only)
    const unitPrice = totalConsumption > 0 ? (totalAmount / totalConsumption) : 0;
    const REFERENCE_PRICE = 0.15; 
    const isAnomaly = unitPrice > (REFERENCE_PRICE * 1.2); 

    // 4. ANALYTICS KPI GENERATION
    const analytics = {
        daily_avg_consumption: Number((totalConsumption / days).toFixed(2)),
        daily_avg_cost: Number((totalAmount / days).toFixed(2)),
        energy_intensity_m2: facilityM2 > 0 ? Number((totalConsumption / facilityM2).toFixed(2)) : null,
        carbon_intensity: totalConsumption > 0 ? Number((finalCo2 / totalConsumption).toFixed(4)) : 0,
        unit_price_index: Number(unitPrice.toFixed(4)),
        confidence_score: aiAnalysis.confidence_score || 0.85,
        anomaly_detected: isAnomaly
    };

    // 5. TECHNICAL IDS (CUPS, TARIFA)
    const technical = aiAnalysis.technical_ids || {};

    // 6. FINAL OBJECT CONSTRUCTION
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
        climatiq_result: emissions && Object.keys(emissions).length > 0 ? {
            co2e: finalCo2,
            co2e_unit: "kg",
            activity_id: emissions.activity_id || "unknown",
            timestamp: now
        } : {},
        extracted_data: {
            vendor: source.vendor?.name || "Unknown",
            customer: source.customer || {},
            cups: technical.cups || null,
            tariff: technical.tariff || null,
            total_amount: totalAmount,
            tax_amount: taxAmount,
            net_amount: netAmount,
            currency: source.currency || "EUR",
            billing_period: { 
                start: billing.start || null, 
                end: billing.end || null 
            },
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