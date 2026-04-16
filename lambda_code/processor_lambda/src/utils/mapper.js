export const buildGoldenRecord = (partitionKey, s3Key, ocrData, forcedStatus, category) => {
    const isDraft = forcedStatus === "PENDING_REVIEW";
    const aiFields = ocrData.fields || {}; // Aquí viene lo que extrajo el Agente

    return {
        PK: partitionKey,
        SK: isDraft ? `INV#UNKNOWN#NONUM${Date.now()}` : `INV#${aiFields.invoice_number}`,
        
        extracted_data: {
            vendor: aiFields.vendor_name || "UNKNOWN",
            vendor_tax_id: aiFields.vendor_tax_id || "PENDING",
            invoice_number: aiFields.invoice_number || "PENDING",
            invoice_date: aiFields.date || "0000-00-00",
            point_of_delivery: aiFields.cups || "NOT_DETECTED",
            total_amount: aiFields.total_amount || 0,
            currency: aiFields.currency || "EUR",
            billing_period: {
                start: aiFields.period_start || "0000-00-00",
                end: aiFields.period_end || "0000-00-00"
            },
            // MAPEAMOS LAS LÍNEAS AQUÍ PARA EL FRONTEND
            lines: aiFields.lines || [] 
        },

        raw_capture: {
            full_text_preview: ocrData.rawText,
            // También las guardamos en raw por si el usuario quiere resetear
            lines: aiFields.lines || [] 
        },

        metadata: {
            s3_key: s3Key,
            status: forcedStatus,
            is_draft: isDraft,
            upload_date: new Date().toISOString()
        },

        ai_analysis: {
            service_type: category || "OTHERS",
            requires_review: true,
            status_triage: "DRAFT_WAITING_VALIDATION"
        }
    };
};