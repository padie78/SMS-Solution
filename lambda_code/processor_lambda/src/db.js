const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, TransactWriteCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const dynamo = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true, convertEmptyValues: true },
});

exports.saveInvoiceWithStats = async (item) => {
    const { orgId, year, month, serviceType, co2e, totalAmount } = item.internal_refs;
    const tableName = process.env.DYNAMO_TABLE;

    // La clave es inicializar el objeto del MES antes de intentar sumarle.
    // Usamos SET para garantizar que el 'path' existe.
    const params = {
        TransactItems: [
            {
                // 1. Guardamos la factura (Audit Trail)
                Put: {
                    TableName: tableName,
                    Item: item.full_record
                }
            },
            {
                // 2. Upsert de Estadísticas: Robusto y Atómico
                Update: {
                    TableName: tableName,
                    Key: { PK: `ORG#${orgId}`, SK: `STATS#${year}` },
                    UpdateExpression: `
                        SET total_co2e_kg = if_not_exists(total_co2e_kg, :zero) + :co2,
                            total_spend = if_not_exists(total_spend, :zero) + :money,
                            invoice_count = if_not_exists(invoice_count, :zero) + :one,
                            
                            #bm = if_not_exists(#bm, :empty_map),
                            #bs = if_not_exists(#bs, :empty_map)
                    `,
                    ExpressionAttributeNames: { "#bm": "by_month", "#bs": "by_service" },
                    ExpressionAttributeValues: { ":co2": co2e, ":money": totalAmount, ":one": 1, ":zero": 0, ":empty_map": {} }
                }
            }
        ]
    };

    try {
        // Ejecutamos la transacción base
        await dynamo.send(new TransactWriteCommand(params));

        // PASO FINAL: Actualización de los valores anidados (Mes y Servicio)
        // Ahora que sabemos que by_month y by_service existen, inicializamos el mes específico.
        await dynamo.send(new TransactWriteCommand({
            TransactItems: [{
                Update: {
                    TableName: tableName,
                    Key: { PK: `ORG#${orgId}`, SK: `STATS#${year}` },
                    UpdateExpression: `
                        SET #bm.#m = if_not_exists(#bm.#m, :empty_month),
                            #bs.#s = if_not_exists(#bs.#s, :zero)
                        ADD #bm.#m.co2 :co2, 
                            #bm.#m.spend :money,
                            #bs.#s :co2
                    `,
                    ExpressionAttributeNames: { "#bm": "by_month", "#bs": "by_service", "#m": month, "#s": serviceType },
                    ExpressionAttributeValues: { 
                        ":co2": co2e, 
                        ":money": totalAmount, 
                        ":zero": 0, 
                        ":empty_month": { co2: 0, spend: 0 } 
                    }
                }
            }]
        }));

        console.log(`✅ [SUCCESS] Datos guardados y estadísticas actualizadas para ${serviceType} en ${month}/${year}`);
        return { success: true };

    } catch (error) {
        console.error("🚨 [DYNAMO_CRITICAL_FAILURE]:", error.message);
        throw error;
    }
};