import { getOrganizationId } from "./utils/s3Helper.js";
import { processInvoicePipeline } from "./services/pipeline.js";

/**
 * Entry Point (AWS Lambda)
 * Su única misión es extraer el contexto de infraestructura 
 * y delegar la lógica de negocio al pipeline.
 */
export const handler = async (event, context) => {
    const startTime = Date.now();
    const requestId = context.awsRequestId;

    // 1. Parsear el evento de S3
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    console.log(`\n🚀 [INBOUND_EVENT] | Req: ${requestId}`);
    console.log(`📂 [LOCATION]      | s3://${bucket}/${key}`);

    try {
        // 2. Identificar Organización (Capa de Infraestructura)
        const orgId = await getOrganizationId(bucket, key);
        console.log(`🆔 [ORG_CONTEXT]   | ${orgId}`);

        // 3. EJECUTAR PIPELINE (Capa de Lógica de Negocio)
        // Pasamos solo lo necesario para que el pipeline haga su magia
        const result = await processInvoicePipeline(bucket, key, orgId);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ [FLOW_COMPLETE] | SK: ${result.SK} | Duration: ${duration}s\n`);

        return {
            statusCode: 200,
            body: JSON.stringify({
                status: "SUCCESS",
                org: orgId,
                sk: result.SK,
                duration: `${duration}s`
            })
        };

    } catch (error) {
        // Manejo de errores centralizado
        console.error(`\n❌ [PIPELINE_CRASH]`);
        console.error(`ID: ${requestId}`);
        console.error(`Reason: ${error.message}\n`);

        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: error.message, 
                requestId,
                path: key 
            })
        };
    }
};