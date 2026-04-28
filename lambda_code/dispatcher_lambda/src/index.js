import { extractInvoiceMetadata } from "./utils/parser.js";
import { getOrganizationId } from "./utils/s3Helper.js";
import { createInvoiceSkeleton } from "./services/databaseService.js";
import { dispatchInvoice } from "./services/dispatchInvoice.js";

// NOTA: No instanciamos clientes aquí porque cada servicio (DB, S3, SQS) 
// ya trae su propio cliente configurado desde su respectivo archivo.

export const handler = async (event, context) => {
    const requestId = context.awsRequestId;
    console.log(`[TRIGGER] [${requestId}] S3 PutObject event received.`);

    try {
        const record = event.Records[0];
        const bucket = record.s3.bucket.name;
        const rawKey = record.s3.object.key;

        // 1. Metadata Extraction (Lógica pura)
        const { sk, key } = extractInvoiceMetadata(rawKey);

        // 2. Organizational Context (Usa su propio cliente S3 internamente)
        const orgId = await getOrganizationId(bucket, key);

        // 3. Database Persistence (Usa el cliente de services/data/client.js)
        await createInvoiceSkeleton(orgId, sk, key, bucket);

        // 4. Message Dispatch (Debería usar su propio cliente SQS)
        await dispatchInvoice(bucket, key, orgId, sk);

        return {
            statusCode: 200,
            body: JSON.stringify({ status: "ENQUEUED", invoiceId: sk, requestId })
        };
    } catch (error) {
        console.error(`[FATAL_ERROR] [${requestId}] Dispatcher workflow failed: ${error.message}`);

        const isClientError = error.message.includes("Protocol") || error.message.includes("Format");

        return {
            statusCode: isClientError ? 400 : 500,
            body: JSON.stringify({
                error: isClientError ? "Invalid Key Metadata" : "Internal Dispatcher Error",
                details: error.message,
                requestId
            })
        };
    }
};