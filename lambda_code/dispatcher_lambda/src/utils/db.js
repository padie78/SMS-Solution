import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../services/data/client.js";

/**
 * Crea el registro inicial (esqueleto) de la factura en DynamoDB
 */
export const createInvoiceSkeleton = async (orgId, sk, s3Key, bucket) => {
    const invoiceSkeleton = {
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

    const params = {
        TableName: TABLE_NAME,
        Item: invoiceSkeleton
    };

    try {
        await ddb.send(new PutCommand(params));
        return invoiceSkeleton;
    } catch (error) {
        console.error(`❌ [DB_ERROR] | Falló createInvoiceSkeleton: ${error.message}`);
        throw error;
    }
};