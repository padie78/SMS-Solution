import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const ddb = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

const TABLE_NAME = "sms-platform-dev-emissions";

export const persistTransaction = async (record) => {
    const { PK, SK, analytics_dimensions, climatiq_result, extracted_data, ai_analysis, metadata } = record;
    
    const year = analytics_dimensions.period_year;
    const month = analytics_dimensions.period_month.toString().padStart(2, '0');
    const service = ai_analysis.service_type || "unknown";
    const statsSK = `STATS#${year}`;

    const params = {
        TransactItems: [
            {
                Put: {
                    TableName: TABLE_NAME,
                    Item: record,
                    ConditionExpression: "attribute_not_exists(SK)" 
                }
            },
            {
                Update: {
                    TableName: TABLE_NAME,
                    Key: { PK, SK: statsSK },
                    // Eliminamos la inicialización de by_month y by_service de aquí
                    // para evitar el solapamiento. Usamos una estructura de SET más directa.
                    UpdateExpression: `
                        SET 
                            by_month.#m.co2 = if_not_exists(by_month.#m.co2, :zero) + :newCo2,
                            by_month.#m.spend = if_not_exists(by_month.#m.spend, :zero) + :newSpend,
                            by_service.#s = if_not_exists(by_service.#s, :zero) + :newCo2,
                            total_co2e_kg = if_not_exists(total_co2e_kg, :zero) + :newCo2,
                            total_spend = if_not_exists(total_spend, :zero) + :newSpend,
                            invoice_count = if_not_exists(invoice_count, :zero) + :one,
                            last_updated = :now,
                            last_file_processed = :fileName
                    `,
                    ExpressionAttributeNames: {
                        "#m": month,
                        "#s": service
                    },
                    ExpressionAttributeValues: {
                        ":newCo2": Number(climatiq_result.co2e),
                        ":newSpend": Number(extracted_data.total_amount),
                        ":one": 1,
                        ":zero": 0,
                        ":now": new Date().toISOString(),
                        ":fileName": metadata.filename
                    }
                }
            }
        ]
    };

    try {
        await ddb.send(new TransactWriteCommand(params));
        console.log(`   ✅ [DB_SUCCESS]: Sincronización completa para ${SK}`);
        return { success: true };
    } catch (error) {
        // Manejo de errores específico
        if (error.name === "TransactionCanceledException") {
            const reasons = error.CancellationReasons;
            
            // Si el error es ValidationException por ruta inexistente, 
            // significa que es el primer registro del año y hay que inicializar los mapas.
            if (error.message?.includes("document path") || reasons?.[1]?.Code === "ValidationError") {
                return await initializeAndPersist(params, record);
            }

            if (reasons?.[0]?.Code === "ConditionalCheckFailed") {
                console.warn(`⚠️ [DB_DUPLICATE]: El archivo ya existe.`);
                return { skipped: true };
            }
        }
        console.error(`❌ [DB_ERROR]:`, error.message);
        throw error;
    }
};

/**
 * Función de respaldo para inicializar el registro STATS si no existe el mapa padre
 */
async function initializeAndPersist(originalParams, record) {
    const { PK, analytics_dimensions } = record;
    const statsSK = `STATS#${analytics_dimensions.period_year}`;
    
    console.log(`   🔧 [DB_INIT]: Inicializando mapas base para ${statsSK}`);
    
    // Simplemente aseguramos que existan los mapas vacíos primero si la transacción falló
    try {
        await ddb.send(new TransactWriteCommand({
            TransactItems: [
                {
                    Update: {
                        TableName: TABLE_NAME,
                        Key: { PK, SK: statsSK },
                        UpdateExpression: "SET by_month = if_not_exists(by_month, :empty), by_service = if_not_exists(by_service, :empty)",
                        ExpressionAttributeValues: { ":empty": {} }
                    }
                }
            ]
        }));
        // Reintentamos la transacción original ahora que los mapas existen
        return await ddb.send(new TransactWriteCommand(originalParams));
    } catch (e) {
        console.error("❌ [DB_INIT_FATAL]: No se pudo inicializar STATS", e.message);
        throw e;
    }
}

export default { persistTransaction };