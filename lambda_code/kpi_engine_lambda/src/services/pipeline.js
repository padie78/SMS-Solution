import { identifyCategory } from "./ia/classifier.js";
import { analyzeInvoice } from "./ia/bedrock.js";
import { calculateFootprint } from "./apis/climatiq.js";
import { buildGoldenRecord } from "../utils/mapper.js";
import { persistTransaction } from "./data/db.js";

/**
 * Orquestador adaptado para DynamoDB Stream
 * @param {Object} streamData - Los datos ya extraídos del Stream (NewImage unmarshalled)
 * @param {string} orgId - ID de la organización
 */
export const pipeline = async (streamData, orgId) => {
    // Extraemos la key original del registro para los logs
    const key = streamData.SK || "unknown_key";
    
    console.log(`\n--- ⚙️ STARTING PIPELINE [ORG: ${orgId}] ---`);

    try {
        // --- FASE 1: INGESTIÓN Y CONTEXTO ---
        // En el stream, el texto ya fue extraído previamente. 
        // Lo tomamos de donde lo guardó la lambda anterior (ej: streamData.raw_text)
        const rawText = streamData.raw_text || ""; 
        
        if (!rawText) {
            throw new Error("No se encontró 'raw_text' en el registro del stream.");
        }

        const detectedCategory = await identifyCategory(rawText);
        console.log(`[PIPELINE] 1. Contexto: Cat detectada "${detectedCategory}"`);

        // --- FASE 2: INTELIGENCIA ARTIFICIAL ---
        const aiAnalysis = await analyzeInvoice(rawText, detectedCategory);
        
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
        console.log(`\n--- 📊 DATA CHECK [${goldenRecord.SK}] ---`);
        console.log(`   💰 Spend: ${goldenRecord.extracted_data?.total_amount || 0}`);
        console.log(`   🌍 CO2:   ${goldenRecord.climatiq_result?.co2e || 0}`);
        
        // persistTransaction debe ser la función que usa updateStats internamente
        await persistTransaction(goldenRecord);
        console.log(`[PIPELINE] 5. Éxito: Registro y estadísticas actualizadas en DB.`);

        return goldenRecord;

    } catch (error) {
        console.error(`\n❌ [PIPELINE_ERROR]: Fallo en el procesamiento del registro ${key}`);
        console.error(`Detalle: ${error.message}`);
        throw error;
    }
};