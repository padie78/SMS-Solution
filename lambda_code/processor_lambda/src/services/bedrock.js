import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
// IMPORTANTE: Integramos tus nuevas reglas
import { buildSystemPrompt } from './bedrock-prompts.js'; 

const client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || "us-east-1",
    maxAttempts: 3
});

/**
 * Servicio de Auditoría GenAI (Claude 3 Haiku).
 * Ahora utiliza prompts dinámicos por categoría para evitar errores de unidades.
 */
export const analyzeInvoice = async (rawText, category = 'OTHERS') => {
    console.log(`   [BEDROCK_START]: Analizando categoría ${category} (${rawText.length} caracteres)...`);

    // 1. Obtenemos el prompt blindado que definimos antes
    const dynamicSystemPrompt = buildSystemPrompt(category);

    const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 2500,
        temperature: 0, // Mantenemos 0 para máxima consistencia técnica
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
        let resultText = responseBody.content[0].text.trim();

        // 2. Limpieza y extracción del JSON
        const jsonStart = resultText.indexOf('{');
        const jsonEnd = resultText.lastIndexOf('}');
        if (jsonStart === -1) {
            console.error("DEBUG: Full response without JSON:", resultText);
            throw new Error("No JSON found in Bedrock response");
        }

        const finalData = JSON.parse(resultText.substring(jsonStart, jsonEnd + 1));

        // 3. Post-procesamiento: Aseguramos que los valores sean numéricos
        if (finalData.emission_lines) {
            finalData.emission_lines = finalData.emission_lines.map(line => ({
                ...line,
                value: Number(line.value) || 0
            }));
        }

        console.log(`   [BEDROCK_END]: Análisis completado. Categoría detectada: ${finalData.category}`);
        
        return finalData;

    } catch (error) {
        console.error(`❌ [BEDROCK_ERROR]:`, error.message);
        throw error;
    }
};

export default { analyzeInvoice };