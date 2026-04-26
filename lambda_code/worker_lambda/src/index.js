import { pipeline } from "./services/pipeline.js";

export const handler = async (event, context) => {
    console.log(`\n🚀 [WORKER_START] | Mensajes a procesar: ${event.Records.length}`);

    for (const record of event.Records) {
        try {
            // 1. Parsear el mensaje que viene de SQS (enviado por el Dispatcher)
            const body = JSON.parse(record.body);
            const { bucket, key, orgId, sk } = body;

            if (!sk || !orgId) {
                console.warn("⚠️ [SKIP] Mensaje malformado: faltan coordenadas (sk/orgId)");
                continue;
            }

            console.log(`🆔 [WORKER_EVENT] | Org: ${orgId} | SK: ${sk} | Key: ${key}`);

            /**
             * 2. Delegar al pipeline. 
             * El pipeline debería:
             * - Bajar el archivo de S3.
             * - Ejecutar IA (Textract/Bedrock).
             * - Calcular Climatiq.
             * - Ejecutar el UpdateItem en DynamoDB usando el PK (orgId) y SK (sk).
             */
            await pipeline(body, orgId);

            console.log(`✅ [WORKER_SUCCESS] | Procesado con éxito: ${sk}`);

        } catch (error) {
            // Si tiramos el error, el mensaje vuelve a SQS para reintentar (según el redrive policy)
            console.error(`❌ [WORKER_ERROR] | ${error.message}`);
            throw error; 
        }
    }

    return { status: "PROCESSED" };
};