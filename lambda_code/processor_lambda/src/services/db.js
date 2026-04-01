import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

// Configuración del cliente optimizada para AWS Lambda
const client = new DynamoDBClient({ 
    region: process.env.AWS_REGION || "eu-central-1" 
});

const ddb = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        removeUndefinedValues: true, // Evita errores si algún campo viene vacío de la IA
    }
});

/**
 * Persiste la factura y actualiza estadísticas en una sola transacción atómica.
 * Implementa idempotencia mediante 'attribute_not_exists(SK)'.
 */
export const persistTransaction = async (record) => {
    const { PK, SK, analytics_dims, metrics } = record;
    
    // Construcción de la SK para el registro de agregados (Stats)
    const statsSK = `STATS#${analytics_dims.year}#FACILITY#${analytics_dims.facility_id}`;

    console.log(`   [DB_PERSIST]: Ejecutando transacción para ${PK} / ${SK}`);

    const params = {
        TransactItems: [
            {
                // 1. Guardar el registro de la factura (Identidad única)
                Put: {
                    TableName: process.env.DYNAMO_TABLE,
                    Item: record,
                    // Previene duplicados si la misma factura se procesa dos veces
                    ConditionExpression: "attribute_not_exists(SK)"
                }
            },
            {
                // 2. Actualizar contadores globales y mensuales (Agregación On-the-fly)
                Update: {
                    TableName: process.env.DYNAMO_TABLE,
                    Key: { PK, SK: statsSK },
                    UpdateExpression: `
                        SET actuals_ytd.total_co2e = if_not_exists(actuals_ytd.total_co2e, :z) + :co2,
                            actuals_ytd.total_cost = if_not_exists(actuals_ytd.total_cost, :z) + :cost,
                            actuals_ytd.count_invoices = if_not_exists(actuals_ytd.count_invoices, :z) + :one,
                            monthly_history.#m = if_not_exists(monthly_history.#m, :empty_m)
                    `,
                    // Nota: Para actualizar campos anidados dentro de monthly_history.#m, 
                    // a veces es necesario hacer un segundo paso o asegurar que el objeto existe.
                    // Aquí actualizamos los totales YTD directamente.
                    ExpressionAttributeNames: { 
                        "#m": analytics_dims.month 
                    },
                    ExpressionAttributeValues: {
                        ":co2": metrics.co2e_tons,
                        ":cost": metrics.consumption_value,
                        ":one": 1, 
                        ":z": 0,
                        ":empty_m": { co2: 0, cost: 0 }
                    }
                }
            }
        ]
    };

    try {
        return await ddb.send(new TransactWriteCommand(params));
    } catch (error) {
        if (error.name === "TransactionCanceledException") {
            console.warn(`⚠️ [DB_DUPLICATE]: La factura ya existe o la condición falló. Omitiendo...`);
            return { skipped: true };
        }
        console.error(`❌ [DB_TRANSACTION_ERROR]:`, error.message);
        throw error;
    }
};

// Exportación por defecto para index.js
export default { persistTransaction };