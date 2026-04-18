export const buildGoldenRecord = (partitionKey, s3Key, aiAnalysis, forcedStatus, defaultCategory) => {
    // 1. Extraer los campos reales del análisis de IA
    // Basado en tus logs, el objeto de Bedrock trae 'extracted_data'
    const fields = aiAnalysis.extracted_data || aiAnalysis.fields || {};
    
    const isDraft = forcedStatus === "PENDING_REVIEW";
    
    // 2. Helpers de validación
    const isInvalid = (val) => 
        !val || val === "PENDING" || val === "UNKNOWN" || val === "NOT_DETECTED" || val === "null" || val === "0000-00-00";
    
    const parseNum = (val) => {
        const n = parseFloat(val);
        return isNaN(n) ? 0 : n;
    };

    // Helper para fechas: Si no detecta nada, ponemos el día de hoy para que db.js no explote
    const safeDate = (dateStr) => {
        if (isInvalid(dateStr)) return new Date().toISOString().split('T')[0];
        return dateStr;
    };

    const cleanForSk = (val) => String(val || "")
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();

    // 3. Lógica de Identificación para el SK
    const categoryPart = cleanForSk(fields.service_category || defaultCategory || "OTHERS");
    
    const vendorId = !isInvalid(fields.vendor_tax_id) ? fields.vendor_tax_id : 
                     (!isInvalid(fields.vendor_name) ? fields.vendor_name : "UNKNOWN");
    const vendorPart = cleanForSk(vendorId);
    
    const numberPart = !isInvalid(fields.invoice_number) 
        ? cleanForSk(fields.invoice_number) 
        : `DRAFT${Date.now()}`;

    const finalSK = `INV#${categoryPart}#${vendorPart}#${numberPart}`;

    // 4. Normalización de líneas
    const sanitizedLines = (fields.lines || []).map(line => ({
        description: line.description || "Sin descripción",
        quantity: parseNum(line.quantity),
        unit: line.unit || "u",
        amount: parseNum(line.amount)
    }));

    return {
        PK: partitionKey,
        SK: finalSK,
        
        extracted_data: {
            vendor_name: fields.vendor_name || "UNKNOWN",
            vendor_tax_id: fields.vendor_tax_id || "PENDING",
            customer_name: fields.customer_name || "UNKNOWN",
            invoice_number: fields.invoice_number || "PENDING",
            invoice_date: safeDate(fields.date),
            
            total_amount: parseNum(fields.total_amount),
            currency: fields.currency || "EUR",
            
            // CORRECCIÓN CRÍTICA: Mapeo de billing_period
            billing_period: {
                // Buscamos en period_start o en el objeto anidado si existe
                start: safeDate(fields.period_start || fields.billing_period?.start),
                end: safeDate(fields.period_end || fields.billing_period?.end)
            },
            lines: sanitizedLines
        },

        // Esto es lo que necesita el KPI Engine para no recalcular
        ai_analysis: {
            service_type: fields.service_category || defaultCategory || "OTHERS",
            requires_review: true,
            status_triage: "PROCESSED_BY_KPI_ENGINE"
        },

        metadata: {
            s3_key: s3Key,
            status: forcedStatus,
            processed_at: new Date().toISOString()
        }
    };
};