import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";

export const persistTransaction = async (goldenRecord) => {
    // 1. Extraemos el status que viene del goldenRecord
    const { PK, SK, extracted_data, climatiq_result, ai_analysis, metadata, status } = goldenRecord;
    const isoNow = new Date().toISOString();

    // Normalización de PK
    const cleanPK = PK.replace("ORG#", "");

    // Cálculo de días prorrateados (mantenemos tu lógica de seguridad)
    const billing = extracted_data?.billing_period || {};
    const startDate = new Date(billing.start || isoNow);
    const endDate = new Date(billing.end || isoNow);
    let totalDays = Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    if (isNaN(totalDays)) totalDays = 1;

    console.log(`📊 [DB_EXEC] PK: ${cleanPK} | SK: ${SK} | Status Final: ${status}`);

    const masterUpdate = {
        Update: {
            TableName: TABLE_NAME,
            Key: { 
                PK: cleanPK, 
                SK: SK 
            },
            UpdateExpression: `SET 
                #st = :status, 
                ai_analysis = :ai, 
                climatiq_result = :cr, 
                extracted_data = :ed, 
                processed_at = :now,
                total_days_prorated = :days,
                metadata = :meta`,
            ConditionExpression: "attribute_exists(PK)", 
            ExpressionAttributeNames: { "#st": "status" },
            ExpressionAttributeValues: {
                // USAMOS EL STATUS QUE VIENE POR PARÁMETRO
                ":status": status || "READY_FOR_REVIEW", 
                ":ai": ai_analysis || {},
                ":cr": climatiq_result || {},
                ":ed": extracted_data || {},
                ":now": isoNow,
                ":days": totalDays,
                ":meta": {
                    ...(metadata || {}),
                    processed_at: isoNow,
                    // Mantenemos consistencia en el objeto metadata también
                    status: status || "READY_FOR_REVIEW",
                    is_draft: false
                }
            }
        }
    };

    try {
        await ddb.send(new TransactWriteCommand({ 
            TransactItems: [masterUpdate] 
        }));

        console.log(`✅ [DB] | Invoice ${SK} actualizada exitosamente a ${status}.`);
        return { success: true };

    } catch (e) {
        if (e.name === "TransactionCanceledException") {
            console.error("❌ [DYNAMO_ERROR]: El registro no existe o la PK/SK están mal.");
        }
        throw e;
    }
};