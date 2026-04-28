import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";

/**
 * Updates the existing Skeleton record.
 */
export const persistTransaction = async (goldenRecord) => {
    const { PK, SK, extracted_data, climatiq_result, ai_analysis, metadata, status } = goldenRecord;
    const isoNow = new Date().toISOString();

    // 1. PK NORMALIZATION: Ensuring match with Dispatcher's "ORG#<UUID>"
    const finalPK = PK.startsWith("ORG#") ? PK : `ORG#${PK}`;

    /**
     * 🔍 DEBUG LOG: Copy-paste these values into DynamoDB "Explore Items" 
     * to verify if the record actually exists.
     */
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
                processed_at = :now,
                updated_at = :now,
                metadata = :meta`,
            /**
             * ⚠️ This condition is failing. If you want to force the update 
             * even if the skeleton is missing, remove this line.
             */
            ConditionExpression: "attribute_exists(PK)", 
            ExpressionAttributeNames: { "#st": "status" },
            ExpressionAttributeValues: {
                ":status": status || "READY_FOR_REVIEW", 
                ":ai": ai_analysis || {},
                ":cr": climatiq_result || {},
                ":ed": extracted_data || {},
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

        console.log(`[DB_SUCCESS] [${SK}] Record promoted to ${status}`);
        return { success: true };

    } catch (e) {
        // More descriptive error handling for the Conditional Check
        if (e.name === "TransactionCanceledException") {
            const reason = e.CancellationReasons?.[0]?.Code;
            if (reason === "ConditionalCheckFailed") {
                console.error(`[DB_ERROR] [${SK}] ConditionalCheckFailed: The Skeleton record does not exist in DynamoDB.`);
                console.error(`[CHECK_REQUIRED] Does PK "${finalPK}" and SK "${SK}" exist in Table "${TABLE_NAME}"?`);
            }
        }
        throw e;
    }
};