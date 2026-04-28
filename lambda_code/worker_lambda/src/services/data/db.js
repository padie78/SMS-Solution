import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";

/**
 * Persists the Golden Record to DynamoDB using a TransactWrite.
 * Ensures the use of Clean PK (UUID only).
 */
export const persistTransaction = async (goldenRecord) => {
    const { PK, SK, extracted_data, climatiq_result, ai_analysis, analytics, metadata, status } = goldenRecord;
    const isoNow = new Date().toISOString();
    
    // Aseguramos que la PK esté limpia en la capa final de persistencia
    const finalPK = PK.replace("ORG#", "");

    console.log(`[DB_ATTEMPT] Target -> PK: [${finalPK}] | SK: [${SK}]`);

    const masterUpdate = {
        Update: {
            TableName: TABLE_NAME,
            Key: { 
                PK: finalPK, 
                SK: SK 
            },
            UpdateExpression: `SET 
                #st = :status, 
                ai_analysis = :ai, 
                climatiq_result = :cr, 
                extracted_data = :ed, 
                analytics = :an,
                processed_at = :now,
                updated_at = :now,
                metadata = :meta`,
            ConditionExpression: "attribute_exists(PK)", 
            ExpressionAttributeNames: { "#st": "status" },
            ExpressionAttributeValues: {
                ":status": status || "READY_FOR_REVIEW", 
                ":ai": ai_analysis || {},
                ":cr": climatiq_result || {},
                ":ed": extracted_data || {},
                ":an": analytics || {},
                ":now": isoNow,
                ":meta": {
                    ...(metadata || {}),
                    processed_at: isoNow,
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

        console.log(`[DB_SUCCESS] [${SK}] Item updated successfully with full metadata and clean PK.`);
        return { success: true };

    } catch (e) {
        if (e.name === "TransactionCanceledException") {
            const reason = e.CancellationReasons?.[0]?.Code;
            if (reason === "ConditionalCheckFailed") {
                console.error(`[DB_ERROR] [${SK}] ConditionalCheckFailed. Target PK: "${finalPK}" not found.`);
            }
        }
        throw e;
    }
};