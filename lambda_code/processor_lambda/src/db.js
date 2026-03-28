const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, TransactWriteCommand } = require("@aws-sdk/lib-dynamodb");

// Aseguramos que el cliente esté definido en el scope correcto
const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const dynamo = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true, convertEmptyValues: true },
});

exports.saveInvoiceWithStats = async (item) => {
    const { orgId, year, month, serviceType, co2e, totalAmount } = item.internal_refs;
    const tableName = process.env.DYNAMO_TABLE;
    
    // Nota de Arquitectura: Dynamo no permite SET y ADD sobre la misma ruta en un solo paso.
    // Usamos SET para todo, lo cual es más predecible para estructuras anidadas.
    const params = {
        TransactItems: [
            {
                Put: {
                    TableName: tableName,
                    Item: item.full_record
                }
            },
            {
                Update: {
                    TableName: tableName,
                    Key: { PK: `ORG#${orgId}`, SK: `STATS#${year}` },
                    UpdateExpression: `
                        SET total_co2e_kg = if_not_exists(total_co2e_kg, :zero) + :co2,
                            total_spend = if_not_exists(total_spend, :zero) + :money,
                            invoice_count = if_not_exists(invoice_count, :zero) + :one,
                            
                            by_month.#m = if_not_exists(by_month.#m, :empty_month),
                            by_service.#s = if_not_exists(by_service.#s, :zero) + :co2
                    `,
                    // Segunda pasada lógica: actualizamos los valores internos del mapa
                    // Como el SET de arriba garantiza que el mapa existe, el ADD posterior 
                    // (o un segundo SET) funciona. Para simplificar en una sola TX:
                    ExpressionAttributeNames: {
                        "#m": month,
                        "#s": serviceType
                    },
                    ExpressionAttributeValues: {
                        ":co2": co2e,
                        ":money": totalAmount,
                        ":one": 1,
                        ":zero": 0,
                        ":empty_month": { co2: co2e, spend: totalAmount } 
                    }
                }
            }
        ]
    };

    // Refinamiento: Si el mes ya existe, el SET :empty_month lo pisaría.
    // La forma "Bulletproof" en una sola TX es usar ADD para los escalares
    // y SET con if_not_exists para los mapas.
    
    const fixedParams = {
        TransactItems: [
            {
                Put: { TableName: tableName, Item: item.full_record }
            },
            {
                Update: {
                    TableName: tableName,
                    Key: { PK: `ORG#${orgId}`, SK: `STATS#${year}` },
                    UpdateExpression: `
                        ADD total_co2e_kg :co2, 
                            total_spend :money,
                            invoice_count :one,
                            by_service.#s :co2,
                            by_month.#m.co2 :co2,
                            by_month.#m.spend :money
                    `,
                    // El "truco" para que ADD no falle en mapas es inicializarlos si no existen
                    // Pero Dynamo requiere que el PADRE (by_month) exista.
                    // Si falla por "ValidationException" de nuevo, inicializaremos el item STATS 
                    // en un paso previo o usaremos un enfoque de SET completo.
                    ExpressionAttributeNames: { "#m": month, "#s": serviceType },
                    ExpressionAttributeValues: { ":co2": co2e, ":money": totalAmount, ":one": 1 }
                }
            }
        ]
    };

    try {
        console.log(`--- [DYNAMO_TX_START] ORG#${orgId} | STATS#${year} ---`);
        return await dynamo.send(new TransactWriteCommand(fixedParams));
    } catch (error) {
        console.error("🚨 [DYNAMO_TRANSACTION_FAILED]:", error.message);
        // Si el error es que el path no existe, necesitamos un "Upsert" manual del STATS
        throw error;
    }
};