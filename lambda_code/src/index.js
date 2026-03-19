const { extraerTexto } = require('./textract');
const { entenderConIA } = require('./bedrock');
const { calcularEnApiExterna } = require('./external_api');
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    const results = [];

    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

        // ✅ Extraemos clientId desde la primera carpeta del key
        // Ej: client123/file.pdf → clientId = "client123"
        const clientId = key.includes('/') ? key.split('/')[0] : 'unknown';
        console.log(`Procesando archivo del cliente: ${clientId}, key: ${key}`);

        try {
            // 1️⃣ Extraer texto del archivo con Textract
            const textoExtraido = await extraerTexto(bucket, key);

            // 2️⃣ Entender datos con IA
            const datosFactura = await entenderConIA(textoExtraido);

            if (!datosFactura || !datosFactura.cantidad) {
                throw new Error("No se pudo extraer el consumo del documento.");
            }

            // 3️⃣ Calcular CO2 usando API externa
            const resultadoCO2 = await calcularEnApiExterna(datosFactura);

            // 4️⃣ Guardar en DynamoDB usando clientId en PK
            await dynamo.put({
                TableName: process.env.DYNAMO_TABLE,
                Item: {
                    PK: `CLIENT#${clientId}`,
                    SK: `EMISSION#${new Date().toISOString()}`,
                    data: datosFactura,
                    co2e: resultadoCO2,
                    status: "VERIFIED"
                }
            }).promise();

            results.push({ status: "success", clientId, co2e: resultadoCO2, key });

        } catch (err) {
            console.error(`Error procesando archivo ${key} para cliente ${clientId}:`, err);

            // Guardar el error en DynamoDB para tracking
            await dynamo.put({
                TableName: process.env.DYNAMO_TABLE,
                Item: {
                    PK: `CLIENT#${clientId}`,
                    SK: `EMISSION_ERROR#${new Date().toISOString()}`,
                    key,
                    error: err.message,
                    status: "ERROR"
                }
            }).promise();

            results.push({ status: "error", clientId, key, message: err.message });
        }
    }

    return results;
};