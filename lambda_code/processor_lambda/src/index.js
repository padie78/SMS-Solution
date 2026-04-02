import { extractText } from "./services/textract.js";
import bedrock from "./services/bedrock.js";
import { calculateFootprint } from "./services/climatiq.js";
import { buildGoldenRecord } from "./utils/mapper.js";
import db from "./services/db.js";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({});

export const handler = async (event, context) => {
    const startTime = Date.now();
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
    const requestId = context.awsRequestId;

    console.log(`🚀 [PIPELINE_START]: Procesando s3://${bucket}/${key}`);

    try {
        // --- FASE 1: OCR ---
        const ocrData = await extractText(bucket, key);

        // --- FASE 2: IA ANALYSIS ---
        const aiAnalysis = await bedrock.analyzeInvoice(ocrData.rawText);
        
        // --- FASE 3: CLIMATIQ CALCULATION ---
        const emissionLines = (aiAnalysis.emission_lines || []).map(line => ({
            ...line,
            category: line.category || aiAnalysis.category || "ELEC"
        }));

        const country = aiAnalysis.extracted_data?.location?.country || "ES";
        const emissionCalculations = await calculateFootprint(emissionLines, country);
        
        const totalCO2 = emissionCalculations.total_kg; 
        const resultsArray = emissionCalculations.items;

        console.log(`🌍 [CLIMATIQ_DONE] | Total: ${totalCO2.toFixed(2)} kgCO2e | Líneas: ${resultsArray.length}`);

        // --- FASE 4: IDENTIFICACIÓN DE ORGANIZACIÓN (LOGICA MEJORADA) ---
        // 1. Intentar extraer del Path (ej: uploads/ID_CLIENTE/archivo.jpg)
        const pathParts = key.split('/');
        const orgIdFromPath = pathParts.length > 1 ? pathParts[1] : null;

        // 2. Intentar extraer de Metadatos de S3
        const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        const orgIdFromMeta = head.Metadata?.['organization-id'] || head.Metadata?.['organizationid'];

        // 3. Selección final (Prioridad: Path > Meta > Fallback)
        const finalOrgId = orgIdFromPath || orgIdFromMeta || 'UNKNOWN_ORG';

        console.log(`🆔 [ORG_IDENTIFIED]: ${finalOrgId} (Source: ${orgIdFromPath ? 'Path' : 'Metadata'})`);

        // --- FASE 5: GOLDEN RECORD (MAPPER) ---
        const goldenRecord = buildGoldenRecord(
            `ORG#${finalOrgId}`, 
            key,
            aiAnalysis,
            emissionCalculations
        );

        // --- FASE 6: DYNAMODB ---
        await db.persistTransaction(goldenRecord);
        
        const duration = (Date.now() - startTime) / 1000;
        return { 
            statusCode: 200, 
            body: JSON.stringify({ 
                status: "SUCCESS", 
                org: finalOrgId,
                sk: goldenRecord.SK,
                duration: `${duration}s`
            }) 
        };

    } catch (error) {
        console.error(`❌ [CRITICAL_FAILURE] [ID:${requestId}]:`, error);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: error.message, requestId }) 
        };
    }
};