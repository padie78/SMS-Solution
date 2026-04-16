export const buildGoldenRecord = (partitionKey, s3Key, ocrData, forcedStatus, category) => {
    const isDraft = forcedStatus === "PENDING_REVIEW";
    const aiFields = ocrData.fields || {};

    // Helper para asegurar que siempre tengamos números válidos
    const parseNum = (val) => {
        const n = parseFloat(val);
        return isNaN(n) ? 0 : n;
    };

    // Normalizamos las líneas para que el Frontend y el motor de ESG no exploten
    const sanitizedLines = (aiFields.lines || []).map(line => ({
        description: line.description || "Sin descripción",
        quantity: parseNum(line.quantity),
        unit: line.unit || "u",
        unit_price: parseNum(line.unit_price),
        amount: parseNum(line.amount)
    }));

    // El SK debe ser predecible para evitar duplicados si se procesa dos veces
    // Usamos el invoice_number si existe, sino un timestamp
    const invoiceId = aiFields.invoice_number && aiFields.invoice_number !== "PENDING" 
        ? aiFields.invoice_number.replace(/\s+/g, '') 
        : `DRAFT${Date.now()}`;

    return {
        PK: partitionKey,
        SK: `INV#${invoiceId}`,
        
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
            lines: sanitizedLines // Guardamos la versión estructurada original
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

        // Campo extra para tu proyecto de Sostenibilidad (SMS)
        total_days_prorated: 0 
    };
};