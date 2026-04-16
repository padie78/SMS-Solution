export const processInvoicePipeline = async (bucket, key, orgId) => {
    try {
        // --- FASE 1: OCR ENRIQUECIDO ---
        // extractText ahora debe devolver: { rawText, fields: { vendor, total, cups, etc } }
        const ocrData = await extractText(bucket, key);
        
        // --- FASE 2: CATEGORIZACIÓN ---
        const detectedCategory = await identifyCategory(ocrData.rawText);

        // --- FASE 3: CONSTRUCCIÓN DEL "FULL DRAFT" ---
        // Enviamos ocrData completo (con los fields detectados)
        const goldenRecord = buildGoldenRecord(
            `ORG#${orgId}`,
            key,
            ocrData, // Pasamos el objeto con fields y rawText
            null,
            "PENDING_REVIEW",
            detectedCategory
        );

        await persistTransaction(goldenRecord);
        
        return { success: true, sk: goldenRecord.SK };

    } catch (error) {
        console.error(`❌ [PIPELINE_ERROR]: ${error.message}`);
        throw error;
    }
};