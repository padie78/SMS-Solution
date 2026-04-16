import { extractText } from "./apis/textract.js";
import { identifyCategory } from "./ia/classifier.js";
import { buildGoldenRecord } from "../utils/mapper.js"; // Usaremos tu mapper actual pero con lógica de poda
import { persistTransaction } from "./data/db.js";

/**
 * Orquestador de Ingesta (S3 Trigger): OCR -> Categorización -> Draft Mínimo en DB
 */
export const processInvoicePipeline = async (bucket, key, orgId) => {
    console.log(`\n--- ⚙️ STARTING LIGHTWEIGHT INGESTION [ORG: ${orgId}] ---`);

    try {
        // --- FASE 1: OCR ---
        // Obtenemos el texto que es el ÚNICO insumo real que necesita la fase 2.
        const ocrData = await extractText(bucket, key);
        
        // --- FASE 2: CLASIFICACIÓN RÁPIDA ---
        // Solo para saber si es ELEC, GAS, etc., y ayudar al filtrado en el Front.
        const detectedCategory = await identifyCategory(ocrData.rawText);
        
        console.log(`[PIPELINE] 1. OCR y Categoría ("${detectedCategory}") listos.`);

        // --- FASE 3: CONSTRUCCIÓN DEL DRAFT ---
        // Le pasamos "PENDING_REVIEW" para que el mapper sepa que debe podar el objeto.
        const goldenRecord = buildGoldenRecord(
            `ORG#${orgId}`,
            key,
            { 
                rawText: ocrData.rawText, 
                category: detectedCategory 
            }, 
            null, // No hay footprint
            "PENDING_REVIEW" 
        );

        // --- FASE 4: PERSISTENCIA ---
        // Guardamos el registro con el SK: INV#UNKNOWN#NONUM...
        await persistTransaction(goldenRecord);
        
        console.log(`[PIPELINE] 2. Draft persistido: ${goldenRecord.SK}`);

        return {
            success: true,
            sk: goldenRecord.SK,
            category: detectedCategory
        };

    } catch (error) {
        console.error(`\n❌ [PIPELINE_ERROR]: Fallo en la ingesta de ${key}`);
        throw error;
    }
};