import { identifyCategory } from "./ia/classifier.js";
import { analyzeInvoice } from "./ia/bedrock.js";
import { calculateFootprint } from "./apis/climatiq.js";
import { buildGoldenRecord } from "../utils/mapper.js";
import { persistTransaction } from "./data/db.js";

/**
 * Orquestador del flujo de negocio: OCR -> Clasificación -> IA -> Cálculo -> DB
 */
export const pipeline = async (key, orgId) => {
    console.log(`\n--- ⚙️ STARTING PIPELINE [ORG: ${orgId}] ---`);

    try {
        // --- FASE 1: INGESTIÓN Y CONTEXTO ---
        //const ocrData = await extractText(bucket, key);
        const detectedCategory = await identifyCategory(ocrData.rawText);
        console.log(`[PIPELINE] 1. Contexto: Cat detectada "${detectedCategory}"`);

        // --- FASE 2: INTELIGENCIA ARTIFICIAL ---
        const aiAnalysis = await analyzeInvoice(ocrData.rawText, detectedCategory);
        
        const aiCat = aiAnalysis?.category || 'N/A';
        const aiConf = (aiAnalysis?.confidence_score || 0).toFixed(2);
        console.log(`[PIPELINE] 2. IA: Procesado como ${aiCat} (Confianza: ${aiConf})`);

        // --- FASE 3: MOTOR DE EMISIONES ---
        const emissionLines = (aiAnalysis.emission_lines || []).map(line => ({
            ...line,
            category: line.category || aiAnalysis.category || "ELEC"
        }));
        
        const country = aiAnalysis.extracted_data?.location?.country || "ES";
        const emissionCalculations = await calculateFootprint(emissionLines, country);
        
        console.log(`[PIPELINE] 3. Cálculo: ${emissionCalculations.total_kg.toFixed(2)} kgCO2e generados`);

        // --- FASE 4: MAPEO Y CALIDAD DE DATOS ---
        const goldenRecord = buildGoldenRecord(
            `ORG#${orgId}`, 
            key,
            aiAnalysis,
            emissionCalculations
        );

        // --- FASE 5: PERSISTENCIA MULTI-TABLA ---
        // Log de diagnóstico previo a la escritura en DynamoDB
        console.log(`\n--- 📊 DATA CHECK [${goldenRecord.SK}] ---`);
        console.log(`   💰 Spend: ${goldenRecord.extracted_data?.total_amount || 0}`);
        console.log(`   🌍 CO2:   ${goldenRecord.climatiq_result?.co2e || 0}`);
        console.log(`   🏢 Vendor: ${goldenRecord.extracted_data?.vendor || 'Unknown'}`);
        console.log(`------------------------------------------`);

        await persistTransaction(goldenRecord);
        console.log(`[PIPELINE] 5. Éxito: Registro y estadísticas actualizadas en DB.`);

        return goldenRecord;

    } catch (error) {
        // Relanzamos el error para que el index.js lo capture con su propio contexto
        console.error(`\n❌ [PIPELINE_ERROR]: Fallo en el procesamiento del archivo ${key}`);
        throw error;
    }
};