import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const ddb = DynamoDBDocumentClient.from(client, { 
    marshallOptions: { removeUndefinedValues: true, convertEmptyValues: true } 
});

const TABLE_NAME = "sms-platform-dev-emissions";

export const persistTransaction = async (record) => {
    const { PK, analytics_dimensions, climatiq_result, extracted_data, ai_analysis, metadata } = record;
    
    const year = analytics_dimensions.period_year;
    const month = analytics_dimensions.period_month.toString().padStart(2, '0');
    const service = (ai_analysis.service_type || "UNKNOWN").toUpperCase();
    const statsSK = `STATS#${year}`;

    const newCo2 = Number(climatiq_result.co2e || 0);
    const newSpend = Number(extracted_data.total_amount || 0);

    // Definimos los nombres de las columnas planas
    const monthCo2Key = `month_${month}_co2`;
    const monthSpendKey = `month_${month}_spend`;
    const serviceCo2Key = `service_${service}_co2`;

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
                    // Estructura PLANA: Actualizamos todo en un solo paso atómico
                    UpdateExpression: `
                        SET #mCo2 = if_not_exists(#mCo2, :zero) + :newCo2,
                            #mSpend = if_not_exists(#mSpend, :zero) + :newSpend,
                            #sCo2 = if_not_exists(#sCo2, :zero) + :newCo2,
                            total_co2e_kg = if_not_exists(total_co2e_kg, :zero) + :newCo2,
                            total_spend = if_not_exists(total_spend, :zero) + :newSpend,
                            invoice_count = if_not_exists(invoice_count, :zero) + :one,
                            last_updated = :now,
                            last_file_processed = :fileName
                    `,
                    ExpressionAttributeNames: { 
                        "#mCo2": monthCo2Key,
                        "#mSpend": monthSpendKey,
                        "#sCo2": serviceCo2Key
                    },
                    ExpressionAttributeValues: {
                        ":newCo2": newCo2,
                        ":newSpend": newSpend,
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
        console.log(`✅ [DB_SUCCESS]: Transacción y Stats Planos actualizados.`);
        return { success: true };
    } catch (error) {
        if (error.name === "TransactionCanceledException") {
            const reasons = error.CancellationReasons;
            
            // Si el ítem de Stats no existe, DynamoDB lo crea automáticamente con el Update.
            // Pero si por alguna razón falla el esquema, aquí manejamos el error.
            if (reasons?.[0]?.Code === "ConditionalCheckFailed") {
                console.warn(`⚠️ [DB_DUPLICATE]: Factura ${record.SK} ya existe.`);
                return { skipped: true };
            }
        }
        console.error("❌ [DB_ERROR]:", error.message);
        throw error;
    }
};

export default { persistTransaction };