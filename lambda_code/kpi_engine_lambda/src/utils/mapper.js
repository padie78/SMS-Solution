// Agregamos emissionResult como parámetro explícito
export const buildGoldenRecord = (partitionKey, s3Key, aiAnalysis, emissionResult, forcedStatus) => {
    
    // 1. Extraer los campos con fallback robusto
    // Si aiAnalysis ya es el objeto extraído, lo usamos; si no, buscamos la propiedad
    const fields = aiAnalysis.extracted_data ? aiAnalysis.extracted_data : aiAnalysis;
    
    // 2. Helpers (mantener igual...)
    const parseNum = (val) => {
        if (typeof val === 'number') return val;
        const n = parseFloat(String(val || "0").replace(/[^0-9.]/g, ''));
        return isNaN(n) ? 0 : n;
    };

    // 3. Identificación para el SK
    // Aseguramos que busque en aiAnalysis o en fields
    const category = fields.service_type || fields.category || "OTHERS";
    // ... resto de lógica de vendor y number ...

    return {
        PK: partitionKey,
        SK: finalSK,
        
        extracted_data: {
            vendor_name: fields.vendor_name || "UNKNOWN",
            vendor_tax_id: fields.vendor_tax_id || "PENDING",
            customer_name: fields.customer_name || "UNKNOWN",
            invoice_number: fields.invoice_number || numberPart,
            invoice_date: fields.invoice_date || new Date().toISOString().split('T')[0],
            total_amount: parseNum(fields.total_amount),
            currency: fields.currency || "EUR",
            billing_period: {
                start: fields.billing_period?.start || fields.period_start,
                end: fields.billing_period?.end || fields.period_end
            },
            lines: fields.lines || []
        },

        // IMPORTANTE: Mapear el resultado de Climatiq que viene del pipeline
        climatiq_result: {
            total_kg: parseNum(emissionResult?.total_kg || 0),
            activity_id: emissionResult?.activity_id || "n/a",
            audit_trail: emissionResult?.items || []
        },

        ai_analysis: {
            service_type: category,
            requires_review: aiAnalysis.requires_review || false,
            confidence: aiAnalysis.confidence_score || 0,
            status_triage: "PROCESSED_BY_KPI_ENGINE"
        },

        metadata: {
            s3_key: s3Key,
            status: forcedStatus || "PROCESSED",
            processed_at: new Date().toISOString()
        }
    };
};