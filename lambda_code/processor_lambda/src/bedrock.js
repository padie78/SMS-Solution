const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });

exports.entenderConIA = async (texto) => {
    const prompt = `Analiza el siguiente texto extraído de una factura de servicios. 
    Extrae: tipo de servicio (luz, gas, agua), cantidad de consumo y unidad.
    Responde ÚNICAMENTE en formato JSON plano: {"tipo": "string", "cantidad": number, "unidad": "string"}.
    Texto: ${texto}`;

    const input = {
        modelId: process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 500,
            messages: [{ role: "user", content: prompt }]
        })
    };

    try {
        const response = await client.send(new InvokeModelCommand(input));
        const rawRes = new TextDecoder().decode(response.body);
        const parsedRes = JSON.parse(rawRes);
        
        // Claude suele meter el texto en content[0].text
        return JSON.parse(parsedRes.content[0].text); 
    } catch (error) {
        console.error("Error en Bedrock:", error);
        throw new Error("La IA no pudo procesar el contexto de la factura.");
    }
};