export const buildGoldenRecord = (partitionKey, s3Key, aiAnalysis, emissionResult, forcedStatus, defaultCategory) => {
    
    // 1. Extraer campos con fallback al objeto raíz
    const fields = aiAnalysis.extracted_data || aiAnalysis.fields || aiAnalysis || {};
    
    // 2. Helpers de formateo
    const isInvalid = (val) => 
        !val || val === "PENDING" || val === "UNKNOWN" || val === "NOT_DETECTED" || val === "null";
    
    const parseNum = (val) => {
        if (typeof val === 'number') return val;
        const n = parseFloat(String(val || "0").replace(/[^0-9.]/g, ''));
        return isNaN(n) ? 0 : n;
    };

    const cleanForSk = (val) => String(val || "")
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();

    // 3. CONSTRUCCIÓN DEL SK (Aquí estaba el fallo de definición)
    const category = fields.service_category || fields.category || fields.service_type || defaultCategory || "OTHERS";
    const categoryPart = cleanForSk(category);
    
    const vendorId = !isInvalid(fields.vendor_tax_id) ? fields.vendor_tax_id : 
                     (!isInvalid(fields.vendor_name) ? fields.vendor_name : "UNKNOWN");
    const vendorPart = cleanForSk(vendorId);
    
    const numberPart = !isInvalid(fields.invoice_number) 
        ? cleanForSk(fields.invoice_number) 
        : `DRAFT${Date.now()}`;

    // Definimos explícitamente finalSK
    const finalSK = `INV#${categoryPart}#${vendorPart}#${numberPart}`;

    // 4. RETORNO DEL OBJETO
    return {
        PK: partitionKey,
        SK: finalSK,
        
        extracted_data: {
            vendor_name: fields.vendor_name || "UNKNOWN",
            vendor_tax_id: fields.vendor_tax_id || "PENDING",
            customer_name: fields.customer_name || "UNKNOWN",
            invoice_number: fields.invoice_number || numberPart,
            invoice_date: fields.invoice_date || fields.date || new Date().toISOString().split('T')[0],
            
            total_amount: parseNum(fields.total_amount || fields.amount),
            currency: fields.currency || "EUR",
            
            billing_period: {
                start: fields.billing_period?.start || fields.period_start || new Date().toISOString().split('T')[0],
                end: fields.billing_period?.end || fields.period_end || new Date().toISOString().split('T')[0]
            },
            lines: fields.lines || []
        },

        // Mapeamos el resultado de Climatiq que antes venía como 0
        climatiq_result: {
            total_kg: parseNum(emissionResult?.total_kg || 0),
            activity_id: emissionResult?.activity_id || "n/a",
            audit_trail: emissionResult?.items || []
        },

        ai_analysis: {
            service_type: category,
            requires_review: aiAnalysis.requires_review || true,
            confidence: aiAnalysis.confidence_score || fields.confidence || 0,
            status_triage: "PROCESSED_BY_KPI_ENGINE"
        },

        metadata: {
            s3_key: s3Key,
            status: forcedStatus || "PROCESSED",
            processed_at: new Date().toISOString(),
            engine_version: "2.5-Professional"
        }
    };
};