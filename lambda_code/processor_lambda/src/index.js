const { extraerTexto } = require('./textract');
const { entenderConIA } = require('./bedrock');
const { calcularEnApiExterna } = require('./external_api');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const dynamo = DynamoDBDocumentClient.from(ddbClient);

exports.handler = async (event) => {
    const results = [];

    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
        const clientId = key.split('/')[0] || 'unknown';

        console.log(`Iniciando procesamiento: ${key}`);

        try {
            // PIPELINE DE PROCESAMIENTO
            const texto = await extraerTexto(bucket, key);
            const datosFactura = await entenderConIA(texto);
            const resultadoCO2 = await calcularEnApiExterna(datosFactura);

            // PERSISTENCIA EXITOSA
            const item = {
                PK: `CLIENT#${clientId}`,
                SK: `EMISSION#${Date.now()}`,
                data: datosFactura,
                co2e: resultadoCO2,
                fileRef: key,
                status: "VERIFIED",
                processedAt: new Date().toISOString()
            };

            await dynamo.send(new PutCommand({
                TableName: process.env.DYNAMO_TABLE,
                Item: item
            }));

            results.push({ key, status: 'success' });

        } catch (err) {
            console.error(`Fallo crítico en archivo ${key}:`, err.message);

            // PERSISTENCIA DE ERROR (Para auditoría)
            await dynamo.send(new PutCommand({
                TableName: process.env.DYNAMO_TABLE,
                Item: {
                    PK: `CLIENT#${clientId}`,
                    SK: `ERROR#${Date.now()}`,
                    fileRef: key,
                    errorMessage: err.message,
                    status: "FAILED"
                }
            }));

            results.push({ key, status: 'error', reason: err.message });
        }
    }

    return results;
};