// 1. Importaciones ESM
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

/**
 * Reutilizamos el cliente fuera del handler para optimizar Warm Starts.
 */
const client = new BedrockRuntimeClient({ region: "eu-central-1" });

/**
 * Identifica la categoría de la factura mediante análisis semántico ligero.
 * @param {string} rawTextSnippet - Primeros N caracteres del OCR.
 * @returns {Promise<string>} - Categoría normalizada para el router de Textract.
 */
export const identifyCategory = async (rawTextSnippet) => {
    console.log(`   [CLASSIFIER_START]: Analizando fragmento de texto...`);

    // Definimos el diccionario de categorías para el prompt y la validación
    const CATEGORIES = {
        ELEC: "Electricity, Utility, Luz, Endesa, Iberdrola",
        GAS: "Natural Gas, Gas Natural, Naturgy",
        LOGISTICS: "Freight, Transport, Logistics, Envío, Camión",
        WASTE: "Waste management, Recycling, Basura, Contenedor",
        WATER: "Water supply, Agua, Canal Isabel II",
        REFRIGERANTS: "HVAC, Gas recharge, Aire Acondicionado, R-410A",
        FLEET_FUEL: "Gasoline, Diesel, Repsol, Shell, Fuel for vehicles",
        BIOMASS: "Pellets, Wood chips, Biomassa",
        HOTEL: "Accommodation, Hotel stay, Noches de hotel",
        CLOUDOPS: "AWS, Azure, Google Cloud, Cloud Services",
        OTHERS: "General / Unknown"
    };

    const prompt = `Analyze this invoice text and return ONLY the category key from this list: 
    ${Object.keys(CATEGORIES).join(", ")}.
    
    Context clues: ${JSON.stringify(CATEGORIES)}

    Invoice Text Snippet:
    ${rawTextSnippet.substring(0, 1500)}`;

    const command = new InvokeModelCommand({
        modelId: "anthropic.claude-3-haiku-20240307-v1:0",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 50, // Aumentamos ligeramente para evitar cortes en el JSON de respuesta
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt
                        }
                    ]
                }
            ],
            temperature: 0
        })
    });

    try {
        const response = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        
        // Limpiamos la respuesta (Claude Haiku a veces es verboso)
        let category = responseBody.content[0].text.trim().toUpperCase();
        
        // Regex para extraer solo la clave (ej: "La categoría es ELEC" -> "ELEC")
        const match = category.match(/[A-Z_]{3,}/);
        const extractedKey = match ? match[0] : "OTHERS";

        // Validación final contra el diccionario de claves
        const finalCategory = CATEGORIES[extractedKey] ? extractedKey : "OTHERS";
        
        console.log(`   [CLASSIFIER_END]: Categoría resuelta -> ${finalCategory}`);
        return finalCategory;

    } catch (error) {
        console.error(`🚨 [CLASSIFIER_ERROR]: Fallo en Bedrock, usando fallback OTHERS.`, error.message);
        return "OTHERS";
    }
};

// 2. Exportación por defecto para mantener consistencia con index.js
export default { identifyCategory };