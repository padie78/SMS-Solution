const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, TransactWriteCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const dynamo = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true, convertEmptyValues: true },
});

exports.saveInvoiceWithStats = async (item) => {
    const { orgId, year, month, serviceType, co2e, totalAmount } = item.internal_refs;
    const tableName = process.env.DYNAMO_TABLE;

    const params = {
        TransactItems: [
            {
                // 1. Guardar el registro detallado (siempre funciona si el esquema es libre)
                Put: {
                    TableName: tableName,
                    Item: item.full_record
                }
            },
            {
                // 2. Actualización de Estadísticas con inicialización de mapa
                Update: {
                    TableName: tableName,
                    Key: { PK: `ORG#${orgId}`, SK: `STATS#${year}` },
                    // Usamos SET para inicializar las estructuras si no existen 
                    // y sumamos en la misma operación.
                    UpdateExpression: `
                        SET total_co2e_kg = if_not_exists(total_co2e_kg, :zero) + :co2,
                            total_spend = if_not_exists(total_spend, :zero) + :money,
                            invoice_count = if_not_exists(invoice_count, :zero) + :one,
                            
                            #bm = if_not_exists(#bm, :empty_map),
                            #bs = if_not_exists(#bs, :empty_map)
                        ADD #bm.#m.co2 :co2, 
                            #bm.#m.spend :money,
                            #bs.#s :co2
                    `,
                    ExpressionAttributeNames: {
                        "#bm": "by_month",
                        "#bs": "by_service",
                        "#m": month,
                        "#s": serviceType
                    },
                    ExpressionAttributeValues: {
                        ":co2": co2e,
                        ":money": totalAmount,
                        ":one": 1,
                        ":zero": 0,
                        ":empty_map": {} 
                    }
                }
            }
        ]
    };

    try {
        console.log(`--- [DYNAMO_TX_ATTEMPT] ORG#${orgId} | STATS#${year} ---`);
        return await dynamo.send(new TransactWriteCommand(params));
    } catch (error) {
        // Si falla por el path del mapa, capturamos el error para debuggear
        console.error("🚨 [DYNAMO_TRANSACTION_FAILED]:", error.name, error.message);
        throw error;
    }
};