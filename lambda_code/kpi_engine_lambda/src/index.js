import { unmarshall } from "@aws-sdk/util-dynamodb";
import { pipeline } from "./services/pipeline.js";

/**
 * KPI Engine Entry Point (DynamoDB Stream)
 * Extrae los datos del stream y delega al pipeline para actualizar stats.
 */
export const handler = async (event, context) => {
    const startTime = Date.now();
    const requestId = context.awsRequestId;

    console.log(`\n🚀 [KPI_ENGINE_START] | Req: ${requestId}`);

    try {
        // 1. DynamoDB Streams puede enviar varios registros a la vez
        for (const record of event.Records) {
            
            // Solo nos interesan eventos donde el dato ya existe o cambió (IA terminó)
            if (!record.dynamodb?.NewImage) continue;

            // 2. Transformar formato DynamoDB a JSON limpio
            const fullData = unmarshall(record.dynamodb.NewImage);
            
            // Extraer contexto (PK suele ser "ORG#123#INV#abc")
            const orgId = fullData.PK.split('#')[1];
            
            console.log(`🆔 [STREAM_CONTEXT] | Org: ${orgId} | Event: ${record.eventName}`);

            // 3. EJECUTAR PIPELINE
            // Pasamos el objeto completo 'fullData' que ya contiene extracted_data y ai_analysis
            await pipeline(fullData, orgId);
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ [KPI_FLOW_COMPLETE] | Duration: ${duration}s\n`);

        return { status: "SUCCESS" };

    } catch (error) {
        console.error(`\n❌ [KPI_PIPELINE_CRASH]`);
        console.error(`ID: ${requestId} | Reason: ${error.message}\n`);
        
        // No devolvemos 500 para evitar que el stream se bloquee infinitamente 
        // a menos que sea un error crítico de infraestructura.
        return { status: "ERROR", message: error.message };
    }
};