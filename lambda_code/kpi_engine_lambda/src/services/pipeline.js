import { identifyCategory } from "./ia/classifier.js";
import { analyzeInvoice } from "./ia/bedrock.js";
import { calculateFootprint } from "./apis/climatiq.js";
import { buildGoldenRecord } from "../utils/mapper.js";
import { persistTransaction } from "./data/db.js";

/**
 * Orquestador: IA (Bedrock) -> Emisiones (Climatiq) -> DB
 */
export const pipeline = async (streamData, orgId) => {
    // streamData es el objeto 'data' que mandó el index.
    // Contiene PK, SK, ai_analysis, extracted_data y... raw_capture!
    
    try {
        // AQUÍ ESTÁ LA CORRECCIÓN:
        const rawText = streamData.raw_capture?.full_text_preview || "";

        if (!rawText) {
            // Log para debuguear si vuelve a fallar
            console.log("DEBUG - Estructura recibida:", JSON.stringify(streamData).substring(0, 200));
            throw new Error("No se encontró full_text_preview dentro de raw_capture");
        }

        // Ahora sí, rawText tiene el contenido y puedes seguir:
        const detectedCategory = await identifyCategory(rawText);
        console.log(`[PIPELINE] 1. Contexto: Cat detectada "${detectedCategory}"`);

        // --- FASE 2: INTELIGENCIA ARTIFICIAL (Bedrock) ---
        console.log(`[PIPELINE] 2. Llamando a Bedrock para análisis...`);
        const aiAnalysis = await analyzeInvoice(rawText, detectedCategory);
        
        const aiCat = aiAnalysis?.category || 'N/A';
        const aiConf = (aiAnalysis?.confidence_score || 0).toFixed(2);
        console.log(`[PIPELINE] 2. IA: Procesado como ${aiCat} (Confianza: ${aiConf})`);

        // --- FASE 3: MOTOR DE EMISIONES (Climatiq) ---
        console.log(`[PIPELINE] 3. Calculando huella con Climatiq...`);
        const emissionLines = (aiAnalysis.emission_lines || []).map(line => ({
            ...line,
            category: line.category || aiAnalysis.category || "ELEC"
        }));
        
        const country = aiAnalysis.extracted_data?.location?.country || "ES";
        const emissionCalculations = await calculateFootprint(emissionLines, country);
        
        console.log(`[PIPELINE] 3. Cálculo: ${emissionCalculations.total_kg.toFixed(2)} kgCO2e generados`);

        // --- FASE 4: MAPEO (Golden Record) ---
        const goldenRecord = buildGoldenRecord(
            `ORG#${orgId}`, 
            key,
            aiAnalysis,
            emissionCalculations
        );

        // --- FASE 5: PERSISTENCIA (DynamoDB Transaction) ---
        console.log(`\n--- 📊 DATA CHECK [${goldenRecord.SK}] ---`);
        console.log(`   💰 Spend:    ${goldenRecord.extracted_data?.total_amount || 0} ${goldenRecord.extracted_data?.currency || ''}`);
        console.log(`   🌍 CO2:      ${goldenRecord.climatiq_result?.total_kg || 0} kg`);
        console.log(`   🏢 Vendor:   ${goldenRecord.extracted_data?.vendor || 'Unknown'}`);
        console.log(`------------------------------------------`);

        await persistTransaction(goldenRecord);
        console.log(`[PIPELINE] 5. Éxito: Registro y estadísticas actualizadas en DB.`);

        return goldenRecord;

    } catch (error) {
        console.error(`\n❌ [PIPELINE_ERROR]: Fallo en el procesamiento del registro ${key}`);
        console.error(`Detalle: ${error.message}`);
        // Log del stack trace para encontrar la línea exacta del fallo si es necesario
        if (error.stack) console.error(`Stack: ${error.stack}`);
        throw error;
    }
};