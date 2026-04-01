const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

/**
 * Reutilizamos el cliente fuera del handler para optimizar Warm Starts.
 */
const client = new BedrockRuntimeClient({ region: "eu-central-1" });

/**
 * Identifica la categoría de la factura mediante análisis semántico ligero.
 * @param {string} rawTextSnippet - Primeros N caracteres del OCR.
 * @returns {Promise<string>} - Categoría normalizada para el router de Textract.
 */
exports.identifyCategory = async (rawTextSnippet) => {
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
    ${rawTextSnippet.substring(0, 1500)}`; // Expandimos un poco a 1500 para capturar headers complejos

    const command = new InvokeModelCommand({
        modelId: "anthropic.claude-3-haiku-20240307-v1:0",
        body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 15, // Un poco más por si Claude agrega puntuación
            temperature: 0, // Determinístico
            messages: [{ role: "user", content: prompt }]
        })
    });

    try {
        const response = await client.send(command);
        const result = JSON.parse(new TextDecoder().decode(response.body));
        
        // Limpiamos la respuesta (Claude a veces devuelve "The category is ELEC")
        let category = result.content[0].text.trim().toUpperCase();
        
        // Extraemos la primera palabra por si devuelve una frase
        category = category.match(/[A-Z_]+/)?.[0] || "OTHERS";

        // Validación final contra el diccionario
        const finalCategory = CATEGORIES[category] ? category : "OTHERS";
        
        console.log(`   [CLASSIFIER_END]: Categoría resuelta -> ${finalCategory}`);
        return finalCategory;

    } catch (error) {
        console.error(`🚨 [CLASSIFIER_ERROR]: Fallo en Bedrock, usando fallback OTHERS.`, error.message);
        return "OTHERS";
    }
};