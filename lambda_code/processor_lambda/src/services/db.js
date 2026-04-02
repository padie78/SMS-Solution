import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ 
    region: process.env.AWS_REGION || "eu-central-1" 
});

const ddb = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        removeUndefinedValues: true,
    }
});

export const persistTransaction = async (record) => {
    const { PK, SK, analytics_dims, metrics } = record;
    
    // SK para el registro de agregados
    const statsSK = `STATS#${analytics_dims.year}#FACILITY#${analytics_dims.facility_id}`;

    console.log(`   [DB_PERSIST]: Ejecutando transacción para ${PK} / ${SK}`);

    const params = {
        TransactItems: [
            {
                // 1. Guardar el registro de la factura
                Put: {
                    TableName: "sms-platform-dev-emissions",
                    Item: record,
                    ConditionExpression: "attribute_not_exists(SK)"
                }
            },
            {
                // 2. Actualizar contadores con inicialización de mapas (Fix para tablas vacías)
                Update: {
                    TableName: "sms-platform-dev-emissions",
                    Key: { PK, SK: statsSK },
                    UpdateExpression: `
                        SET 
                            actuals_ytd = if_not_exists(actuals_ytd, :empty_ytd),
                            monthly_history = if_not_exists(monthly_history, :empty_map)
                    `,
                    ExpressionAttributeValues: {
                        ":empty_ytd": { total_co2e: 0, total_cost: 0, count_invoices: 0 },
                        ":empty_map": {}
                    }
                }
            },
            {
                // 3. Incremento de valores reales
                Update: {
                    TableName: "sms-platform-dev-emissions",
                    Key: { PK, SK: statsSK },
                    UpdateExpression: `
                        SET 
                            actuals_ytd.total_co2e = actuals_ytd.total_co2e + :co2,
                            actuals_ytd.total_cost = actuals_ytd.total_cost + :cost,
                            actuals_ytd.count_invoices = actuals_ytd.count_invoices + :one,
                            monthly_history.#m = if_not_exists(monthly_history.#m, :empty_m)
                    `,
                    ExpressionAttributeNames: { "#m": analytics_dims.month },
                    ExpressionAttributeValues: {
                        ":co2": metrics.co2e_tons,
                        ":cost": metrics.consumption_value,
                        ":one": 1,
                        ":empty_m": { co2: 0, cost: 0 }
                    }
                }
            }
        ]
    };

    try {
        const result = await ddb.send(new TransactWriteCommand(params));
        console.log(`   ✅ [DB_SUCCESS]: Transacción completada.`);
        return result;
    } catch (error) {
        // Log detallado de la razón de cancelación
        if (error.name === "TransactionCanceledException") {
            const reasons = error.CancellationReasons;
            console.warn(`⚠️ [DB_CANCELLED]:`, JSON.stringify(reasons));
            
            if (reasons[0].Code === "ConditionalCheckFailed") {
                console.warn(`   -> La factura ya existe (Idempotencia).`);
                return { skipped: true };
            }
        }
        
        console.error(`❌ [DB_TRANSACTION_ERROR]:`, error.message);
        throw error;
    }
};

export default { persistTransaction };