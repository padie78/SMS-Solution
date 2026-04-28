import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./data/client.js";
import { buildInvoiceSkeleton } from "./dbSchema.js";

/**
 * Persists the initial invoice skeleton to DynamoDB.
 */
export const createInvoiceSkeleton = async (orgId, sk, s3Key, bucket) => {
    // 1. Logic: Generate the structured object
    const invoiceItem = buildInvoiceSkeleton(orgId, sk, s3Key, bucket);

    const params = {
        TableName: TABLE_NAME,
        Item: invoiceItem
    };

    try {
        console.log(`[DB_OPERATION] [${sk}] Initializing record in table: ${TABLE_NAME}`);
        
        await ddb.send(new PutCommand(params));
        
        console.log(`[DB_SUCCESS] [${sk}] Skeleton successfully persisted for Org: ${orgId}`);
        return invoiceItem;

    } catch (error) {
        // Logging non-sensitive technical details for CloudWatch
        console.error(`[DB_FATAL_ERROR] [${sk}] Persistence failed. Reason: ${error.message}`);
        
        // Throwing error to trigger Lambda retry or DLQ logic
        throw new Error(`Cloud database failure: ${error.message}`);
    }
};