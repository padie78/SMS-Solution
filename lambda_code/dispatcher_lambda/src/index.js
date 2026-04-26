import { getOrganizationId } from "./utils/s3Helper.js";
import { dispatchInvoice } from "./services/dispatchInvoice.js"; // Nuevo nombre del servicio

export const handler = async (event, context) => {
    // Tomamos el primer registro del evento de S3
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    console.log(`🚀 [DISPATCHER_HANDLER] | Iniciando despacho para: ${key}`);

    try {
        // Obtenemos el ID de la organización (metadata o path)
        const orgId = await getOrganizationId(bucket, key);

        // Enviamos a SQS mediante la lógica de despacho
        await dispatchInvoice(bucket, key, orgId);

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                status: "ENQUEUED", // Cambiado de ACCEPTED a ENQUEUED para ser más preciso
                key,
                orgId 
            })
        };

    } catch (error) {
        console.error(`❌ [DISPATCHER_HANDLER_ERROR] | ${error.message}`);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: "Failed to enqueue invoice for processing",
                details: error.message 
            })
        };
    }
};