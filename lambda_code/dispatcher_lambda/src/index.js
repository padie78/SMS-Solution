import { S3Client } from "@aws-sdk/client-s3"; // Importación necesaria
import { getOrganizationId } from "./utils/s3Helper.js";
import { createInvoiceSkeleton } from "./utils/db.js";
import { dispatchInvoice } from "./services/dispatchInvoice.js";

// Instanciamos el cliente fuera del handler para reutilizarlo
const s3Client = new S3Client({}); 

export const handler = async (event, context) => {
    console.log("📥 [HANDLER] | Evento recibido:", JSON.stringify(event));
    
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    // --- NUEVA LÓGICA: EXTRAER SK DEL NOMBRE DEL ARCHIVO ---
    // La key es algo como: uploads/userId/INV#123__factura.pdf
    const fileName = key.split('/').pop(); 
    const sk = fileName.split('__')[0]; 

    if (!sk || !sk.startsWith('INV#')) {
        console.error("❌ ERROR: No se pudo extraer un InvoiceID válido de la Key:", key);
        return { statusCode: 400, body: "Invalid Key Format" };
    }

    console.log(`🆔 [HANDLER] | SK Extraído: ${sk} | Bucket: ${bucket}`);

    try {
        const orgId = await getOrganizationId(bucket, key);

        // 1. Persistencia: Creamos el registro esqueleto en Dynamo
        await createInvoiceSkeleton(orgId, sk, key, bucket);

        // 2. Mensajería: Despachamos a la cola SQS
        // Le pasamos el 'sk' que extrajimos del nombre
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