import { getTextFromS3 } from "./apis/textract.js";
import { identifyCategory } from "./ia/classifier.js";
import { analyzeInvoice } from "./ia/bedrock.js";
// import { calculateFootprint } from "./apis/climatiq.js"; // 🚫 Desactivado
import { buildGoldenRecord } from "../utils/mapper.js";
import { persistTransaction } from "./data/db.js"; 
import { notifyInvoiceUpdate } from "./notifications/appsyncService.js";

export const pipeline = async (params) => {
    const { bucket, key, sk, orgId } = params;
    const startTime = Date.now();

    console.log(`[PIPELINE_START] [${sk}] Mode: Extraction Only (No Footprint)`);

    try {
        // --- PHASE 0: OCR ---
        const rawText = await getTextFromS3(bucket, key); 
        if (!rawText) throw new Error("Textract returned empty content");
        
        // --- PHASE 1: CATEGORY ---
        const detectedCategory = await identifyCategory(rawText);

        // --- PHASE 2: LLM ANALYSIS ---
        console.log(`[PIPELINE_STEP] [${sk}] Extracting invoice data via Bedrock...`);
        const aiAnalysis = await analyzeInvoice(rawText, detectedCategory);
        
        // --- PHASE 3: FOOTPRINT CALCULATION (SKIPPED) ---
        const emissionCalculations = { total_kg: 0, items: [] };

        // --- PHASE 4: MAPPING ---
        // El mapper ya está preparado para recibir valores en 0 o vacíos
        const goldenRecord = buildGoldenRecord(
            orgId.startsWith('ORG#') ? orgId : `ORG#${orgId}`,
            sk, 
            aiAnalysis,
            emissionCalculations,
            "READY_FOR_REVIEW", 
            detectedCategory,
            { s3_key: key, bucket: bucket }
        );

        // --- PHASE 5: PERSISTENCE ---
        await persistTransaction(goldenRecord);

        // --- PHASE 6: UI NOTIFICATION ---
        try {
            console.log(`[PIPELINE_STEP] [${sk}] Notifying Frontend...`);
            
            // Enviamos solo la data pura de la factura
            const uiPayload = {
                vendor: aiAnalysis.source_data?.vendor?.name || "Unknown",
                total_amount: aiAnalysis.source_data?.total_amount?.total_with_tax || 0,
                currency: aiAnalysis.source_data?.currency || "EUR",
                billing_period: aiAnalysis.source_data?.billing_period || {},
                invoice_lines: aiAnalysis.emission_lines || [] 
            };

            await notifyInvoiceUpdate(sk, "READY_FOR_REVIEW", "Digitization complete", uiPayload);
        } catch (notifyErr) {
            console.warn(`[PIPELINE_WARN] [${sk}] Notification failed: ${notifyErr.message}`);
        }

        const duration = (Date.now() - startTime) / 1000;
        console.log(`[PIPELINE_SUCCESS] [${sk}] Finished in ${duration}s (Footprint skipped)`);

        return goldenRecord;

    } catch (error) {
        console.error(`[PIPELINE_FATAL_ERROR] [${sk}] ${error.message}`);
        await notifyInvoiceUpdate(sk, "FAILED", `Error: ${error.message}`);
        throw error; 
    }
};