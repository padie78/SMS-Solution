export const buildGoldenRecord = (partitionKey, s3Key, aiData, forcedStatus = null) => {
    const isDraft = forcedStatus === "PENDING_REVIEW";
    const data = typeof aiData === 'string' ? JSON.parse(aiData) : aiData;

    // Si es Draft (Ingesta S3), generamos un SK temporal y devolvemos solo lo vital
    if (isDraft) {
        return {
            PK: partitionKey,
            SK: `INV#UNKNOWN#NONUM${Date.now()}`,
            ai_analysis: {
                raw_text: data.rawText || null,
                service_type: (data.category || "OTHERS").toUpperCase(),
                is_draft: true
            },
            metadata: {
                s3_key: s3Key,
                status: "PENDING_REVIEW",
                upload_date: new Date().toISOString()
            }
        };
    }
};