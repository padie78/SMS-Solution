import { extractText } from "./apis/textract.js";
import { identifyCategory } from "./ia/classifier.js";
import { buildGoldenRecord } from "../utils/mapper.js";
import { persistTransaction } from "./data/db.js";

/**
 * Orquestador de Ingesta (S3 Trigger): OCR -> Categorización -> Draft en DB
 * El cálculo de IA (Bedrock) y Huella (Climatiq) se delega a la API de aprobación.
 */
export const processInvoicePipeline = async (bucket, key, orgId) => {
    console.log(`\n--- ⚙️ STARTING INGESTION PIPELINE [ORG: ${orgId}] ---`);

    try {
        // --- FASE 1: EXTRACCIÓN Y CONTEXTO ---
        // Extraemos el texto crudo; este será el insumo para Bedrock en la API de aprobación.
        const ocrData = await extractText(bucket, key);
        
        // Identificamos la categoría para ayudar al usuario en el triage inicial.
        const detectedCategory = await identifyCategory(ocrData.rawText);
        console.log(`[PIPELINE] 1. OCR Finalizado. Categoría sugerida: "${detectedCategory}"`);

        // --- FASE 2: MAPEO DE REGISTRO INICIAL (BORRADOR) ---
        // Generamos el Golden Record con valores en 0 y estado PENDING_REVIEW.
        const goldenRecord = buildGoldenRecord(
            `ORG#${orgId}`,
            key,
            { 
                rawText: ocrData.rawText, 
                category: detectedCategory 
            }, 
            {}, // Sin cálculos de Climatiq aún
            "PENDING_REVIEW" 
        );

        // --- FASE 3: PERSISTENCIA EN DYNAMODB ---
        // Solo guarda el registro de la factura. No actualiza estadísticas (STATS#).
        await persistTransaction(goldenRecord);
        
        console.log(`[PIPELINE] 2. Éxito: Registro creado [${goldenRecord.SK}] en estado PENDING_REVIEW.`);

        return goldenRecord;

    } catch (error) {
        console.error(`\n❌ [PIPELINE_ERROR]: Fallo en la ingesta del archivo ${key}`);
        throw error;
    }
};