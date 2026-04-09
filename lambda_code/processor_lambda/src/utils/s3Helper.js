import { processInvoicePipeline } from "./services/pipeline.js";
import { getOrganizationId } from "./utils/s3Helper.js";

export const handler = async (event, context) => {
    const startTime = Date.now();
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    const requestId = context.awsRequestId;

    try {
        // 1. Identificar la organización dueña del archivo
        const orgId = await getOrganizationId(bucket, key);
        console.log(`🚀 [START]: Org: ${orgId} | File: ${key}`);

        // 2. Ejecutar el Pipeline modular
        const goldenRecord = await processInvoicePipeline(bucket, key, orgId);

        const duration = (Date.now() - startTime) / 1000;
        
        return { 
            statusCode: 200, 
            body: JSON.stringify({ 
                status: "SUCCESS", 
                org: orgId,
                sk: goldenRecord.SK,
                duration: `${duration}s`
            }) 
        };

    } catch (error) {
        // Centralización de errores
        console.error(`❌ [PIPELINE_ERROR] [ID:${requestId}]:`, error);
        
        return { 
            statusCode: 500, 
            body: JSON.stringify({ 
                error: error.message, 
                requestId,
                phase: error.phase || "unknown" 
            }) 
        };
    }
};