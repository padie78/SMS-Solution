import { unmarshall } from "@aws-sdk/util-dynamodb";
import { pipeline } from "./services/pipeline.js";

export const handler = async (event, context) => {
    console.log(`\n🚀 [KPI_ENGINE_START] | Records: ${event.Records.length}`);

    for (const record of event.Records) {
        // 1. Solo procesar si hay datos nuevos
        if (!record.dynamodb?.NewImage) continue;

        const data = unmarshall(record.dynamodb.NewImage);

        // 2. SEGURIDAD: Solo procesar facturas (INV#), ignorar estadísticas (STATS#)
        // Esto evita el bucle infinito.
        if (data.SK && data.SK.startsWith("STATS#")) {
            console.log("⏭️ [SKIP] Registro de estadística detectado, ignorando para evitar recursión.");
            continue;
        }

        try {
            const orgId = data.PK.split('#')[1];
            console.log(`🆔 [STREAM_EVENT] | Org: ${orgId} | SK: ${data.SK}`);

            // 3. Delegar al pipeline (le pasamos el objeto limpio 'data')
            await pipeline(data, orgId);

        } catch (error) {
            console.error(`❌ [ERROR] | ${error.message}`);
        }
    }

    return { status: "PROCESSED" };
};