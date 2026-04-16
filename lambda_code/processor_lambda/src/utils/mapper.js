export const buildGoldenRecord = (partitionKey, s3Key, ocrData, forcedStatus, category) => {
    const isDraft = forcedStatus === "PENDING_REVIEW";
    const aiFields = ocrData.fields || {};

    // 1. Helpers de validación y limpieza
    const isInvalid = (val) => !val || val === "PENDING" || val === "UNKNOWN" || val === "NOT_DETECTED";
    
    const parseNum = (val) => {
        const n = parseFloat(val);
        return isNaN(n) ? 0 : n;
    };

    const cleanForSk = (val) => String(val || "")
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();

    // 2. Lógica de Identificación del Proveedor (Tu lógica original)
    // Prioridad: Tax ID del Vendedor > Nombre del Vendedor > "UNKNOWN"
    const rawIdForSk = !isInvalid(aiFields.vendor_tax_id) ? aiFields.vendor_tax_id : 
                       (!isInvalid(aiFields.vendor_name) ? aiFields.vendor_name : "UNKNOWN");

    const vendorPart = cleanForSk(rawIdForSk);
    
    // 3. Lógica del Número de Factura
    const numberPart = !isInvalid(aiFields.invoice_number) 
        ? cleanForSk(aiFields.invoice_number) 
        : `DRAFT${Date.now()}`;

    // SK Final: INV#VENDEDOR#NUMERO
    const finalSK = `INV#${vendorPart}#${numberPart}`;

    // 4. Normalización de líneas
    const sanitizedLines = (aiFields.lines || []).map(line => ({
        description: line.description || "Sin descripción",
        quantity: parseNum(line.quantity),
        unit: line.unit || "u",
        unit_price: parseNum(line.unit_price),
        amount: parseNum(line.amount)
    }));

    return {
        PK: partitionKey,
        SK: finalSK,
        
        extracted_data: {
            vendor: aiFields.vendor_name || "UNKNOWN",
            vendor_tax_id: aiFields.vendor_tax_id || "PENDING",
            invoice_number: aiFields.invoice_number || "PENDING",
            invoice_date: aiFields.date || "0000-00-00",
            point_of_delivery: aiFields.cups || "NOT_DETECTED",
            total_amount: parseNum(aiFields.total_amount),
            currency: aiFields.currency || "EUR",
            billing_period: {
                start: aiFields.period_start || "0000-00-00",
                end: aiFields.period_end || "0000-00-00"
            },
            lines: sanitizedLines
        },

        raw_capture: {
            full_text_preview: ocrData.rawText,
            lines: sanitizedLines
        },

        metadata: {
            s3_key: s3Key,
            status: forcedStatus,
            is_draft: isDraft,
            upload_date: new Date().toISOString(),
            processed_by: "Bedrock-Claude3-Haiku"
        },

        ai_analysis: {
            service_type: category || "OTHERS",
            requires_review: true,
            status_triage: "DRAFT_WAITING_VALIDATION",
            tax_total: parseNum(aiFields.tax_amount)
        },

        total_days_prorated: 0 
    };
};