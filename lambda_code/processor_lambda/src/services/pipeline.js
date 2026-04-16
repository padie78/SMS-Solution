import { extractText } from "./apis/textract.js";
import { identifyCategory } from "./ia/classifier.js";
import { buildGoldenRecord } from "../utils/mapper.js"; // Usaremos tu mapper actual pero con lógica de poda
import { persistTransaction } from "./data/db.js";
import { callExtractionAgent } from "./ia/agent.js";

export const processInvoicePipeline = async (bucket, key, orgId) => {
    try {
        // --- FASE 1: OCR ENRIQUECIDO ---
        // extractText ahora debe devolver: { rawText, fields: { vendor, total, cups, etc } }
        const ocrData = await extractText(bucket, key);
        
        const structuredData = await callExtractionAgent(ocrData.rawText);

        // --- FASE 3: CONSTRUCCIÓN DEL "FULL DRAFT" ---
        // Enviamos ocrData completo (con los fields detectados)
       const goldenRecord = buildGoldenRecord(
        `ORG#${orgId}`,
        key,
        { 
            ...ocrData,
            fields: structuredData // El agente llena los campos que antes estaban vacíos
        }, 
        "PENDING_REVIEW" 
        );

        await persistTransaction(goldenRecord);
        
        return { success: true, sk: goldenRecord.SK };

    } catch (error) {
        console.error(`❌ [PIPELINE_ERROR]: ${error.message}`);
        throw error;
    }
};