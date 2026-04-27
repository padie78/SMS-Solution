import { getOrganizationId } from "./utils/s3Helper.js";
import { createInvoiceSkeleton } from "./utils/db.js";
import { dispatchInvoice } from "./services/dispatchInvoice.js";

export const handler = async (event, context) => {
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    
    const clientInvoiceId = event.arguments.invoiceId;

    // 2. Usamos el ID del cliente para el Skeleton y para la respuesta
    const sk = clientInvoiceId;

    console.log(`📥 [HANDLER] | Evento recibido: Bucket=${bucket}, Key=${key}, InvoiceID=${clientInvoiceId}`);

    console.log(`🚀 [HANDLER] | Procesando archivo: ${key}`);

    try {
        const orgId = await getOrganizationId(bucket, key);

        // 1. Persistencia: Creamos el registro esqueleto
        await createInvoiceSkeleton(orgId, sk, key, bucket);

        // 2. Mensajería: Despachamos a la cola SQS
        await dispatchInvoice(bucket, key, orgId, sk);

        return {
            statusCode: 200,
            body: JSON.stringify({ status: "ENQUEUED", sk, orgId })
        };

    } catch (error) {
        console.error(`❌ [HANDLER_ERROR] | ${error.message}`);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};