import { getTextFromS3 } from "./apis/textract.js"; // Necesitás crear este helper
import { identifyCategory } from "./ia/classifier.js";
import { analyzeInvoice } from "./ia/bedrock.js";
import { calculateFootprint } from "./apis/climatiq.js";
import { buildGoldenRecord } from "../utils/mapper.js";
import { persistTransaction } from "./data/db.js"; // CAMBIO: de persist a update
import { notifyInvoiceUpdate } from "./notifications/appsyncService.js";

/**
 * Orquestador: S3 -> Textract -> IA -> Climatiq -> DB (Update)
 */
export const pipeline = async (sqsMessage, orgId) => {
    // sqsMessage ahora trae: { bucket, key, sk, orgId }
    const { bucket, key, sk } = sqsMessage;

    console.log(`\n--- ⚙️ STARTING PIPELINE [SK: ${sk}] ---`);

    try {
        // --- FASE 0: EXTRACCIÓN DE TEXTO (S3 -> Textract) ---
        // Como el Dispatcher solo nos dio la ruta, el Worker debe leer el archivo
        console.log(`[PIPELINE] 0. Extrayendo texto de s3://${bucket}/${key}`);
        const rawText = await getTextFromS3(bucket, key); 

        if (!rawText) throw new Error("No se pudo extraer texto del documento");

        // --- FASE 1: CLASIFICACIÓN ---
        const detectedCategory = await identifyCategory(rawText);
        console.log(`[PIPELINE] 1. Contexto: Cat detectada "${detectedCategory}"`);

        // --- FASE 2: IA (Bedrock) ---
        const aiAnalysis = await analyzeInvoice(rawText, detectedCategory);

        // --- FASE 3: MOTOR DE EMISIONES (Climatiq) ---
        const emissionLines = (aiAnalysis.emission_lines || []).map(line => ({
            ...line,
            category: line.category || aiAnalysis.category || "ELEC"
        }));

        const country = aiAnalysis.extracted_data?.location?.country || "ES";
        const emissionCalculations = await calculateFootprint(emissionLines, country);

        // --- FASE 4: MAPEO (Golden Record) ---
        // Importante: Usamos el 'sk' que vino de SQS para mantener la referencia al Skeleton
        const goldenRecord = buildGoldenRecord(
            `ORG#${orgId}`,
            sk, 
            aiAnalysis,
            emissionCalculations,
            "READY_FOR_REVIEW", // Status final
            detectedCategory,
            { s3_key: key, bucket: bucket } // metadata básica
        );

        // --- FASE 5: PERSISTENCIA (UpdateItem) ---
        // Cambiamos 'persistTransaction' por una función que haga UPDATE
        await persistTransaction(goldenRecord);
        console.log(`[PIPELINE] 5. Éxito: Skeleton actualizado a Golden Record.`);

        // --- FASE 6: NOTIFICACIÓN (AppSync) ---
        try {
            await notifyInvoiceUpdate(sk, "READY_FOR_REVIEW", "IA terminó: Datos listos para revision", goldenRecord);
        } catch (err) {
            // Silencioso para el flujo, pero logueado
            console.warn(`[NOTIFY_SILENT_FAIL] SK: ${sk}`);
        }

        return goldenRecord;

    } catch (error) {
        console.error(`\n❌ [PIPELINE_ERROR]: Fallo en el procesamiento de ${sk}`);
        
        // --- NOTIFICACIÓN DE ERROR (Fundamental) ---
        try {
            await notifyInvoiceUpdate(sk, "FAILED", `Error: ${error.message}`);
        } catch (notifyErr) {
            console.error("No se pudo notificar el fallo a AppSync");
        }

        throw error; // Re-lanzamos para que SQS sepa que falló
    }
};