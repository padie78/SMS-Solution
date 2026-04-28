import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";

export const persistTransaction = async (goldenRecord) => {
    const { PK, SK, extracted_data, climatiq_result, ai_analysis, metadata, status } = goldenRecord;
    const isoNow = new Date().toISOString();
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
                processed_at = :now,
                updated_at = :now,
                metadata = :meta`,
            ConditionExpression: "attribute_exists(PK)", 
            ExpressionAttributeNames: { "#st": "status" },
            ExpressionAttributeValues: {
                ":status": status || "READY_FOR_REVIEW", 
                ":ai": ai_analysis || {},
                ":cr": climatiq_result || {},
                ":ed": extracted_data || {}, // <--- Esto ya trae el IVA y las líneas del Mapper
                ":now": isoNow,
                ":meta": {
                    ...(metadata || {}), // Mantiene lo que venía del Skeleton (bucket, s3_key)
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

        console.log(`[DB_SUCCESS] [${SK}] Item updated successfully using Clean PK.`);
        return { success: true };

    } catch (e) {
        if (e.name === "TransactionCanceledException") {
            const reason = e.CancellationReasons?.[0]?.Code;
            if (reason === "ConditionalCheckFailed") {
                console.error(`[DB_ERROR] [${SK}] ConditionalCheckFailed. Target PK: "${finalPK}"`);
                // Este log te dirá si el problema ahora es que al SK le sobra algo
                console.error(`[DEBUG] Check if SK "${SK}" exists under PK "${finalPK}"`);
            }
        }
        throw e;
    }
};