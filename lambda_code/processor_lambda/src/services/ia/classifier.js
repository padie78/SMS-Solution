// 1. Importaciones ESM
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({ region: "eu-central-1" });

export const identifyCategory = async (rawTextSnippet) => {

    console.log(`   [CLASSIFIER_START]: Clasificando...`);

    const CATEGORIES = {
        ELEC: "Electricity, Utility, Luz, Endesa, Iberdrola, kWh, Energía Activa",
        GAS: "Natural Gas, Gas Natural, Naturgy, m3, kWh Gas",
        LOGISTICS: "Freight, Transport, Logistics, Envío, Camión, Gasoil A",
        WASTE: "Waste management, Recycling, Basura, Contenedor",
        WATER: "Water supply, Agua, Canal Isabel II, m3",
        REFRIGERANTS: "HVAC, Gas recharge, Aire Acondicionado, R-410A, R-134a",
        FLEET_FUEL: "Gasoline, Diesel, Repsol, Shell, Fuel for vehicles, Litros",
        BIOMASS: "Pellets, Wood chips, Biomassa",
        HOTEL: "Accommodation, Hotel stay, Noches de hotel",
        CLOUDOPS: "AWS, Azure, Google Cloud, Cloud Services",
        OTHERS: "General / Unknown"
    };

    // Usamos el formato de System Prompt para mayor control
    const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 20,
        temperature: 0,
        system: `You are a document classifier. Return ONLY the category key from the provided list. 
                 If you see 'kWh' and 'Energía', you MUST return 'ELEC'. 
                 Valid keys: ${Object.keys(CATEGORIES).join(", ")}.`,
        messages: [
            {
                role: "user",
                content: [{ 
                    type: "text", 
                    text: `Classify this invoice text:\n\n${rawTextSnippet.substring(0, 1500)}` 
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
        const result = responseBody.content[0].text.trim().toUpperCase();
        
        // Extraemos solo la palabra de la lista (por si Claude responde "Category: ELEC")
        const finalCategory = Object.keys(CATEGORIES).find(key => result.includes(key)) || "OTHERS";
        
        console.log(`   [CLASSIFIER_END]: Categoría resuelta -> ${finalCategory}`);
        return finalCategory;

    } catch (error) {
        console.error(`🚨 [CLASSIFIER_ERROR]: Fallback a OTHERS.`, error.message);
        return "OTHERS";
    }
};

export default { identifyCategory };