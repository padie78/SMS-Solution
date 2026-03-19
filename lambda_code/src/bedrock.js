const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const client = new BedrockRuntimeClient({ region: "us-east-1" });

async function entenderConIA(textoExtraido) {
    const prompt = `
    Sos un experto en auditoría de carbono. Analizá el siguiente texto extraído de una factura.
    Extraé los siguientes datos en formato JSON estricto:
    - tipo_energia: (ej. Diesel, Electricidad, Gas Natural)
    - cantidad: (el número de consumo)
    - unidad: (ej. kWh, Litros, m3)
    - periodo: (mes y año si figura)

    Si falta algún dato, poné null.
    Texto: ${textoExtraido}`;

    const params = {
        modelId: "anthropic.claude-3-haiku-20240307-v1:0",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 500,
            messages: [{ role: "user", content: prompt }]
        })
    };

    try {
        const command = new InvokeModelCommand(params);
        const response = await client.send(command);
        const resBody = JSON.parse(new TextDecoder().decode(response.body));
        return JSON.parse(resBody.content[0].text);
    } catch (error) {
        console.error("Error en Bedrock:", error);
        return null;
    }
}

module.exports = { entenderConIA };