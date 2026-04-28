import { getTextFromS3 } from "./apis/textract.js";
import { identifyCategory } from "./ia/classifier.js";
import { analyzeInvoice } from "./ia/bedrock.js";
import { calculateFootprint } from "./apis/climatiq.js";
import { buildGoldenRecord } from "../utils/mapper.js";
import { persistTransaction } from "./data/db.js"; 
import { notifyInvoiceUpdate } from "./notifications/appsyncService.js";

/**
 * AI Pipeline Orchestrator: S3 -> Textract -> Bedrock -> Climatiq -> DynamoDB
 * @param {Object} params - Object containing { bucket, key, sk, orgId }
 */
export const pipeline = async (params) => {
    const { bucket, key, sk, orgId } = params;
    const startTime = Date.now();

    console.log(`[PIPELINE_START] [${sk}] Processing invoice for Org: ${orgId}`);

    try {
        // --- PHASE 0: TEXT EXTRACTION (S3 -> Textract) ---
        console.log(`[PIPELINE_STEP] [${sk}] 0. Extracting raw text via Textract...`);
        const rawText = await getTextFromS3(bucket, key); 

        if (!rawText) throw new Error("Textract returned empty content");

        // --- PHASE 1: CLASSIFICATION ---
        console.log(`[PIPELINE_STEP] [${sk}] 1. Identifying emission category...`);
        const detectedCategory = await identifyCategory(rawText);
        console.log(`[PIPELINE_INFO] [${sk}] Context identified: ${detectedCategory}`);

        // --- PHASE 2: AI ANALYSIS (Bedrock) ---
        console.log(`[PIPELINE_STEP] [${sk}] 2. Running Bedrock LLM analysis...`);
        const aiAnalysis = await analyzeInvoice(rawText, detectedCategory);

        // --- PHASE 3: EMISSIONS ENGINE (Climatiq) ---
        console.log(`[PIPELINE_STEP] [${sk}] 3. Calculating carbon footprint...`);
        const emissionLines = (aiAnalysis.emission_lines || []).map(line => ({
            ...line,
            category: line.category || aiAnalysis.category || "ELEC"
        }));

        const country = aiAnalysis.extracted_data?.location?.country || "ES";
        const emissionCalculations = await calculateFootprint(emissionLines, country);

        // --- PHASE 4: MAPPING (Golden Record) ---
        console.log(`[PIPELINE_STEP] [${sk}] 4. Building Golden Record.`);
        const goldenRecord = buildGoldenRecord(
            orgId.startsWith('ORG#') ? orgId : `ORG#${orgId}`,
            sk, 
            aiAnalysis,
            emissionCalculations,
            "READY_FOR_REVIEW", 
            detectedCategory,
            { s3_key: key, bucket: bucket }
        );

        // --- PHASE 5: PERSISTENCE (DynamoDB Update) ---
        console.log(`[PIPELINE_STEP] [${sk}] 5. Updating DynamoDB record...`);
        await persistTransaction(goldenRecord);

        // --- PHASE 6: NOTIFICATION (AppSync) ---
        try {
            console.log(`[PIPELINE_STEP] [${sk}] 6. Sending AppSync notification...`);
            await notifyInvoiceUpdate(sk, "READY_FOR_REVIEW", "AI Analysis completed: Ready for review.", goldenRecord);
        } catch (notifyErr) {
            console.warn(`[PIPELINE_WARN] [${sk}] Notification failed but record was saved: ${notifyErr.message}`);
        }

        const duration = (Date.now() - startTime) / 1000;
        console.log(`[PIPELINE_SUCCESS] [${sk}] Total processing time: ${duration}s`);

        return goldenRecord;

    } catch (error) {
        console.error(`[PIPELINE_FATAL_ERROR] [${sk}] Pipeline crashed.`);
        console.error(`[ERROR_DETAILS]: ${error.message}`);
        
        // CRITICAL: Notify failure to UI
        try {
            await notifyInvoiceUpdate(sk, "FAILED", `AI Processing Error: ${error.message}`);
        } catch (notifyErr) {
            console.error(`[PIPELINE_CRITICAL] [${sk}] Could not notify failure to AppSync.`);
        }

        // Re-throw to SQS for DLQ/Retry handling
        throw error; 
    }
};