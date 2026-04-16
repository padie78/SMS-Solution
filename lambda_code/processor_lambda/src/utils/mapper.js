export const buildDraftRecord = (partitionKey, s3Key, ocrData) => {
    const timestamp = Date.now();
    const now = new Date().toISOString();

    return {
        PK: partitionKey,
        SK: `INV#UNKNOWN#NONUM${timestamp}`,
        
        // 1. DATA ESTRUCTURADA (Campos detectados directamente)
        extracted_data: {
            vendor: ocrData.fields?.vendor_name || "UNKNOWN",
            vendor_tax_id: ocrData.fields?.vendor_tax_id || "PENDING",
            invoice_number: ocrData.fields?.invoice_number || "PENDING",
            invoice_date: ocrData.fields?.date || "0000-00-00",
            point_of_delivery: ocrData.fields?.cups || "NOT_DETECTED",
            total_amount: Number(ocrData.fields?.total_amount || 0),
            currency: ocrData.fields?.currency || "EUR",
            billing_period: {
                start: ocrData.fields?.period_start || "0000-00-00",
                end: ocrData.fields?.period_end || "0000-00-00"
            }
        },

        // 2. DATA CRUDA (Para que el usuario vea el desglose sin procesar)
        // Aquí es donde el usuario verá los consumos, potencias e impuestos tal cual se leyeron
        raw_capture: {
            lines: ocrData.lines || [], // Si el OCR te da un array de líneas de texto, van aquí
            full_text_preview: ocrData.rawText // El texto completo para un modal de "Ver Original"
        },

        // 3. CONTEXTO TÉCNICO
        ai_analysis: {
            service_type: (ocrData.category || "ELEC").toUpperCase(),
            requires_review: true,
            status_triage: "DRAFT_WAITING_VALIDATION"
        },

        metadata: {
            s3_key: s3Key,
            status: "PENDING_REVIEW",
            is_draft: true,
            upload_date: now
        }
    };
};