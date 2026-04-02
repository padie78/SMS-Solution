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

const TABLE_NAME = "sms-platform-dev-emissions";

export const persistTransaction = async (record) => {
    const { PK, SK, analytics_dims, metrics } = record;
    
    // SK para el registro de agregados (Anual/Instalación)
    const statsSK = `STATS#${analytics_dims.year}#FACILITY#${analytics_dims.facility_id}`;

    console.log(`   [DB_PERSIST]: Ejecutando transacción en ${TABLE_NAME}`);

    const params = {
        TransactItems: [
            {
                // 1. Guardar el "Golden Record" de la factura
                Put: {
                    TableName: TABLE_NAME,
                    Item: record,
                    ConditionExpression: "attribute_not_exists(SK)"
                }
            },
            {
                // 2. Actualizar Estadísticas (Estructura plana para evitar errores de inicialización)
                Update: {
                    TableName: TABLE_NAME,
                    Key: { PK, SK: statsSK },
                    UpdateExpression: `
                        SET total_co2e_ytd = if_not_exists(total_co2e_ytd, :zero) + :co2,
                            total_cost_ytd = if_not_exists(total_cost_ytd, :zero) + :cost,
                            count_invoices_ytd = if_not_exists(count_invoices_ytd, :zero) + :one,
                            last_updated = :now
                    `,
                    ExpressionAttributeValues: {
                        ":co2": metrics.co2e_tons,
                        ":cost": metrics.consumption_value,
                        ":one": 1,
                        ":zero": 0,
                        ":now": new Date().toISOString()
                    }
                }
            }
        ]
    };

    try {
        await ddb.send(new TransactWriteCommand(params));
        console.log(`   ✅ [DB_SUCCESS]: Registro y estadísticas actualizados.`);
        return { success: true };
    } catch (error) {
        if (error.name === "TransactionCanceledException") {
            const reason = error.CancellationReasons?.[0]?.Code;
            if (reason === "ConditionalCheckFailed") {
                console.warn(`⚠️ [DB_DUPLICATE]: La factura ya existe. SK: ${SK}`);
                return { skipped: true };
            }
            console.error("❌ [DB_CANCELLED_REASON]:", JSON.stringify(error.CancellationReasons));
        }
        
        console.error(`❌ [DB_ERROR]:`, error.message);
        throw error;
    }
};

export default { persistTransaction };