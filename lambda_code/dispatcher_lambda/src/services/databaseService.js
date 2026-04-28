import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./data/client.js";
import { buildInvoiceSkeleton } from "../utils/dbSchema.js";

/**
 * Persiste el esqueleto en DynamoDB.
 */
export const createInvoiceSkeleton = async (orgId, sk, s3Key, bucket) => {
    try {
        // 1. Generamos el objeto (ahora es síncrono, no necesita await)
        const invoiceItem = buildInvoiceSkeleton(orgId, sk, s3Key, bucket);

        console.log(`[DB_OPERATION] [${sk}] Attempting write to ${TABLE_NAME} for Org: ${orgId}`);

        const params = {
            TableName: TABLE_NAME,
            Item: invoiceItem
        };

        // 2. Un solo punto de persistencia
        await ddb.send(new PutCommand(params));
        
        console.log(`[DB_SUCCESS] [${sk}] Skeleton successfully persisted.`);
        return invoiceItem;

    } catch (error) {
        console.error(`[DB_FATAL_ERROR] [${sk}] Persistence failed: ${error.message}`);
        throw new Error(`Cloud database failure: ${error.message}`);
    }
};