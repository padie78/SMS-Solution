export const buildGoldenRecord = (partitionKey, s3Key, aiAnalysis, forcedStatus, defaultCategory) => {
    // 1. EXTRAER CAMPOS (Intento buscar en todas las estructuras posibles de la IA)
    const fields = aiAnalysis.extracted_data || aiAnalysis.fields || aiAnalysis || {};
    
    // 2. HELPERS
    const isInvalid = (val) => 
        !val || val === "PENDING" || val === "UNKNOWN" || val === "NOT_DETECTED" || val === "null";
    
    const parseNum = (val) => {
        if (typeof val === 'number') return val;
        const n = parseFloat(String(val || "0").replace(/[^0-9.]/g, ''));
        return isNaN(n) ? 0 : n;
    };

    const safeDate = (dateStr) => {
        if (isInvalid(dateStr) || dateStr === "0000-00-00") {
            return new Date().toISOString().split('T')[0];
        }
        return dateStr;
    };

    const cleanForSk = (val) => String(val || "")
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();

    // 3. IDENTIFICACIÓN PARA EL SK (Jerarquía)
    const category = fields.service_category || fields.category || defaultCategory || "OTHERS";
    const categoryPart = cleanForSk(category);
    
    const vendorId = !isInvalid(fields.vendor_tax_id) ? fields.vendor_tax_id : 
                     (!isInvalid(fields.vendor_name) ? fields.vendor_name : "UNKNOWN");
    const vendorPart = cleanForSk(vendorId);
    
    const numberPart = !isInvalid(fields.invoice_number) 
        ? cleanForSk(fields.invoice_number) 
        : `DRAFT${Date.now()}`;

    const finalSK = `INV#${categoryPart}#${vendorPart}#${numberPart}`;

    // 4. MAPEO DEL REGISTRO FINAL
    return {
        PK: partitionKey,
        SK: finalSK,
        
        extracted_data: {
            vendor_name: fields.vendor_name || "UNKNOWN",
            vendor_tax_id: fields.vendor_tax_id || "PENDING",
            customer_name: fields.customer_name || "UNKNOWN",
            invoice_number: fields.invoice_number || numberPart,
            invoice_date: safeDate(fields.date || fields.invoice_date),
            
            total_amount: parseNum(fields.total_amount || fields.amount),
            currency: fields.currency || "EUR",
            
            billing_period: {
                start: safeDate(fields.period_start || fields.billing_period?.start),
                end: safeDate(fields.period_end || fields.billing_period?.end)
            },
            lines: fields.lines || []
        },

        // Aquí guardamos el análisis para el motor de KPIs
        ai_analysis: {
            service_type: category,
            requires_review: true,
            confidence: fields.confidence || 0,
            status_triage: "PROCESSED_BY_KPI_ENGINE"
        },

        metadata: {
            s3_key: s3Key,
            status: forcedStatus || "PROCESSED",
            processed_at: new Date().toISOString(),
            engine_version: "2.0-DeepFetch"
        }
    };
};