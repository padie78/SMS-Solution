import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { buildSystemPrompt } from './bedrock_prompt.js'; 

const client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || "us-east-1",
    maxAttempts: 3
});

/**
 * Servicio de Auditoría GenAI (Claude 3 Haiku).
 * Extrae y garantiza un Objeto JSON listo para el Mapper.
 */
export const analyzeInvoice = async (rawText, category = 'OTHERS') => {
    console.log(`   [BEDROCK_START]: Analizando categoría ${category} (${rawText.length} caracteres)...`);

    const dynamicSystemPrompt = buildSystemPrompt(category);

    const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 2500,
        temperature: 0, 
        system: dynamicSystemPrompt,
        messages: [
            {
                role: "user",
                content: [{ 
                    type: "text", 
                    text: `Analyze the following OCR text and provide the JSON output following the strict rules provided: \n\nRAW OCR TEXT:\n${rawText}` 
                }]
            }
        ]
    };

    try {
        const command = new InvokeModelCommand({
            modelId: "anthropic.claude-3-haiku-20240307-v1:0",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(payload)
        });

        const response = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        
        // 1. Extraemos el texto de la respuesta de Claude
        let resultText = responseBody.content[0].text.trim();

        // 2. Limpieza de Markdown y extracción de JSON
        // A veces Claude envuelve el JSON en ```json ... ```
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("DEBUG: Full response without JSON:", resultText);
            throw new Error("No JSON found in Bedrock response");
        }

        // 3. PARSE FINAL: Convertimos el string en Objeto JS
        const finalData = JSON.parse(jsonMatch[0]);

        // 4. Post-procesamiento: Normalización de datos críticos
        // Bedrock a veces devuelve números como strings, aquí los forzamos
        if (finalData.emission_lines) {
            finalData.emission_lines = finalData.emission_lines.map(line => ({
                ...line,
                value: Number(line.value) || 0,
                confidence_score: Number(line.confidence_score) || 0
            }));
        }

        // Normalizamos también el monto total si existe
        if (finalData.source_data?.total_amount) {
            finalData.source_data.total_amount.total_with_tax = Number(finalData.source_data.total_amount.total_with_tax) || 0;
        }

        console.log(`   [BEDROCK_END]: Análisis completado. Categoría detectada: ${finalData.analytics_metadata?.category || 'N/A'}`);
        
        // Retornamos un OBJETO, no un STRING
        return finalData;

    } catch (error) {
        console.error(`❌ [BEDROCK_ERROR]:`, error.message);
        throw error;
    }
};

export default { analyzeInvoice };