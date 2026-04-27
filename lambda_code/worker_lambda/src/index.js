import { pipeline } from "./services/pipeline.js";

export const handler = async (event, context) => {
    console.log(`\n🚀 [WORKER_START] | Mensajes a procesar: ${event.Records.length}`);

    for (const record of event.Records) {
        try {
            // 1. Parsear el mensaje que viene de SQS
            const body = JSON.parse(record.body);
            
            // Si el Dispatcher/S3-Trigger no te mandó el 'sk' explícito,
            // lo extraemos directamente de la 'key' de S3.
            let { bucket, key, orgId, sk } = body;

            if (!sk && key) {
                // Extraemos el nombre del archivo (ej: "INV#123__factura.pdf")
                const fileName = key.split('/').pop();
                // Tomamos la parte antes del doble guion bajo
                sk = fileName.split('__')[0];
                
                console.log(`🔍 [WORKER] SK extraído de la Key: ${sk}`);
            }

            // Validación de seguridad
            if (!sk) {
                console.warn("⚠️ [SKIP] No se pudo determinar el SK (invoiceId) para la key:", key);
                continue;
            }

            // Hardcodeamos orgId si no viene, o lo sacamos del path si es necesario
            const finalOrgId = orgId || "DEFAULT_ORG"; 

            console.log(`🆔 [WORKER_EVENT] | Org: ${finalOrgId} | SK: ${sk} | Key: ${key}`);

            /**
             * 2. Delegar al pipeline. 
             * Ahora el objeto 'body' tiene el 'sk' correcto para que el pipeline 
             * pueda actualizar DynamoDB y notificar a AppSync con el ID que espera el Front.
             */
            const pipelineData = { ...body, sk: sk }; 
            await pipeline(pipelineData, finalOrgId);

            console.log(`✅ [WORKER_SUCCESS] | Procesado con éxito: ${sk}`);

        } catch (error) {
            console.error(`❌ [WORKER_ERROR] | ${error.message}`);
            // Al lanzar el error, SQS hará el reintento automático
            throw error; 
        }
    }

    return { status: "PROCESSED" };
};