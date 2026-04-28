import { pipeline } from "./services/pipeline.js";

/**
 * SQS Worker Handler - Carbon Emissions AI Pipeline
 * Orchestrates the processing of messages from the SQS queue.
 */
export const handler = async (event, context) => {
    const totalRecords = event.Records.length;
    console.log(`[WORKER_START] Batch received. Records to process: ${totalRecords}`);

    for (const record of event.Records) {
        // We use the SQS MessageId for traceability within the loop
        const messageId = record.messageId;
        
        try {
            // 1. Message Parsing
            const body = JSON.parse(record.body);
            let { bucket, key, orgId, sk } = body;

            console.log(`[WORKER_PROCESS] [${messageId}] Parsing message for S3 Key: ${key}`);

            // 2. SK Recovery Strategy (Fail-safe)
            // If the Dispatcher didn't send the SK, we extract it from the S3 Key format
            if (!sk && key) {
                const fileName = key.split('/').pop();
                sk = fileName.split('__')[0];
                console.log(`[WORKER_DEBUG] [${messageId}] SK extracted from S3 Key: ${sk}`);
            }

            // 3. Integrity Validation
            if (!sk || !sk.startsWith('INV#')) {
                console.warn(`[WORKER_SKIP] [${messageId}] Invalid or missing SK. Skipping record. Key: ${key}`);
                continue; 
            }

            // Organization ID Context
            const finalOrgId = orgId || "DEFAULT_ORG";

            console.log(`[WORKER_EVENT] [${sk}] Starting Pipeline | Org: ${finalOrgId} | Bucket: ${bucket}`);

            /**
             * 4. Pipeline Execution
             * We ensure 'sk' and 'orgId' are explicitly passed to maintain 
             * consistency across DynamoDB updates and AppSync notifications.
             */
            const pipelineParams = { 
                ...body, 
                sk, 
                orgId: finalOrgId 
            };

            await pipeline(pipelineParams);

            console.log(`[WORKER_SUCCESS] [${sk}] Workflow completed successfully.`);

        } catch (error) {
            // Structured error logging for CloudWatch Metrics
            console.error(`[WORKER_FATAL_ERROR] [${messageId}] processing failed.`);
            console.error(`[ERROR_DETAILS]: ${error.message}`);
            
            /**
             * Re-throwing the error ensures SQS visibility timeout logic 
             * triggers a retry or moves the message to the DLQ.
             */
            throw error;
        }
    }

    console.log(`[WORKER_FINISHED] All ${totalRecords} messages handled.`);
    return { status: "BATCH_PROCESSED" };
};