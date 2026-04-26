import { getOrganizationId } from "./utils/s3Helper.js";
import { processInvoice } from "./services/processInvoice.js";

export const handler = async (event, context) => {
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    try {
        const orgId = await getOrganizationId(bucket, key);

        // Delegamos el envío a SQS a la lógica de negocio
        await processInvoice(bucket, key, orgId);

        return {
            statusCode: 200,
            body: JSON.stringify({ status: "ACCEPTED", key })
        };

    } catch (error) {
        console.error(`❌ [HANDLER_ERROR] | ${error.message}`);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};