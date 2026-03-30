const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, TransactWriteCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const dynamo = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true, convertEmptyValues: true },
});

/**
 * Persistencia Atómica de Factura y Actualización de Estadísticas
 * Blindada contra valores undefined en el reduce.
 */
exports.saveInvoiceWithStats = async (data) => {
    // 1. Desestructuración segura con valores por defecto
    const internal = data.internal_refs || {};
    const orgId = internal.orgId || 'UNKNOWN_ORG';
    const year = internal.year || new Date().getFullYear().toString();
    const month = internal.month || (new Date().getMonth() + 1).toString().padStart(2, '0');
    const totalAmount = Number(internal.totalAmount) || 0;
    
    // BLINDAJE CRÍTICO: Aseguramos que 'items' sea siempre un array para el reduce
    const items = Array.isArray(internal.items) ? internal.items : [];
    
    const { full_record } = data;
    const tableName = process.env.DYNAMO_TABLE || "sms-platform-dev-emissions";

    if (!full_record || !full_record.SK) {
        console.error("🚨 [DB_ERROR]: full_record o SK faltante.");
        return { success: false, reason: "MISSING_RECORD_DATA" };
    }

    // 2. Agregación local segura
    const serviceTotals = items.reduce((acc, item) => {
        if (item && item.strategy) {
            acc[item.strategy] = (acc[item.strategy] || 0) + (Number(item.co2e) || 0);
        }
        return acc;
    }, {});

    const totalCo2eFactura = Object.values(serviceTotals).reduce((a, b) => a + b, 0);

    try {
        // PASO 1: Guardar Factura e inicializar contadores
        const mainTransaction = {
            TransactItems: [
                {
                    Put: { 
                        TableName: tableName, 
                        Item: full_record,
                        ConditionExpression: "attribute_not_exists(SK)" 
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
                                by_service = if_not_exists(by_service, :empty_map)
                        `,
                        ExpressionAttributeNames: { "#m": month },
                        ExpressionAttributeValues: { 
                            ":co2": totalCo2eFactura, 
                            ":money": totalAmount, 
                            ":one": 1, 
                            ":zero": 0,
                            ":empty_month": { co2: 0, spend: 0 },
                            ":empty_map": {}
                        }
                    }
                }
            ]
        };

        await dynamo.send(new TransactWriteCommand(mainTransaction));

        // PASO 2: Actualizar desglose por servicio (solo si hay servicios detectados)
        const services = Object.keys(serviceTotals);
        if (services.length > 0) {
            for (const [service, co2Value] of Object.entries(serviceTotals)) {
                await dynamo.send(new TransactWriteCommand({
                    TransactItems: [{
                        Update: {
                            TableName: tableName,
                            Key: { PK: `ORG#${orgId}`, SK: `STATS#${year}` },
                            UpdateExpression: `
                                SET by_service.#s = if_not_exists(by_service.#s, :zero) + :co2,
                                    by_month.#m.co2 = if_not_exists(by_month.#m.co2, :zero) + :co2,
                                    by_month.#m.spend = if_not_exists(by_month.#m.spend, :zero) + :money_share
                            `,
                            ExpressionAttributeNames: { "#s": service, "#m": month },
                            ExpressionAttributeValues: { 
                                ":co2": co2Value, 
                                ":zero": 0,
                                ":money_share": (service === services[0]) ? totalAmount : 0 
                            }
                        }
                    }]
                }));
            }
        }

        console.log(`✅ [DB_SUCCESS]: Invoice ${full_record.invoice_no || 'N/A'} and stats updated.`);
        return { success: true };

    } catch (error) {
        if (error.name === "TransactionCanceledException" || error.message.includes("ConditionalCheckFailed")) {
            console.warn(`⏭️ [DUPLICATE_SKIP]: SK ${full_record.SK} ya existe en DynamoDB.`);
            return { success: false, reason: "ALREADY_EXISTS" };
        }

        console.error("🚨 [DYNAMO_ERROR]:", error.message);
        throw error;
    }
};