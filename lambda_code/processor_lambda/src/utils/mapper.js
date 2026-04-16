export const buildDraftRecord = (partitionKey, s3Key, ocrData) => {
    const timestamp = Date.now();

    return {
        PK: partitionKey,
        SK: `INV#UNKNOWN#NONUM${timestamp}`,
        
        // Esta es la data que Textract obtuvo y que el front va a renderizar
        ai_analysis: {
            raw_text: ocrData.rawText, 
            service_type: (ocrData.category || "ELEC").toUpperCase(),
            requires_review: true
        },

        // Data necesaria para que el front sepa dónde está el archivo y su estado
        metadata: {
            s3_key: s3Key,
            status: "PENDING_REVIEW",
            is_draft: true,
            upload_date: new Date().toISOString()
        },

        // Inicializamos los campos de datos vacíos para evitar errores de undefined en Svelte
        extracted_data: {
            vendor: "UNKNOWN",
            invoice_number: "PENDING",
            total_amount: 0
        }
    };
};