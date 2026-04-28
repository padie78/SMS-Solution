/**
 * Solo construye el objeto (Factory Pattern)
 */
export const buildInvoiceSkeleton = (orgId, sk, s3Key, bucket) => {
    // Validación de seguridad
    if (!orgId) throw new Error("Missing orgId (PK)");
    if (!sk) throw new Error("Missing sk (SK)");

    return {
        PK: orgId,
        SK: sk,
        status: "PROCESSING",
        processed_at: null,
        ai_analysis: {
            service_type: "PENDING",
            value: 0,
            unit: "",
            status_triage: "IN_QUEUE"
        },
        climatiq_result: {},
        extracted_data: {
            vendor: "Extracting...",
            total_amount: 0,
            currency: "",
            billing_period: { start: null, end: null }
        },
        metadata: {
            s3_key: s3Key,
            bucket: bucket,
            status: "UPLOADED",
            is_draft: true
        }
    };
};