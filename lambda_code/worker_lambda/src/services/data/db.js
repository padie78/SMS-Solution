import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";

/**
 * Updates an existing Skeleton record with AI extraction data.
 */
export const persistTransaction = async (goldenRecord) => {
    const { PK, SK, extracted_data, climatiq_result, ai_analysis, metadata, status } = goldenRecord;
    const isoNow = new Date().toISOString();

    // 1. PK CONSISTENCY: Ensure we keep the ORG# prefix to match the Skeleton
    const finalPK = PK.startsWith("ORG#") ? PK : `ORG#${PK}`;

    // 2. SAFE PRORATION LOGIC
    const billing = extracted_data?.billing_period || {};
    const startDate = new Date(billing.start || isoNow);
    const endDate = new Date(billing.end || isoNow);
    let totalDays = Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    if (isNaN(totalDays) || totalDays <= 0) totalDays = 1;

    console.log(`[DB_EXEC] [${SK}] Updating status to: ${status} | Org: ${finalPK}`);

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
                total_days_prorated = :days,
                metadata = :meta`,
            // Previene crear un item nuevo si el Skeleton no existe
            ConditionExpression: "attribute_exists(PK)", 
            ExpressionAttributeNames: { "#st": "status" },
            ExpressionAttributeValues: {
                ":status": status || "READY_FOR_REVIEW", 
                ":ai": ai_analysis || {},
                ":cr": climatiq_result || { total_kg: 0, items: [] }, // Default for skipped footprints
                ":ed": extracted_data || {},
                ":now": isoNow,
                ":days": totalDays,
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

        console.log(`[DB_SUCCESS] [${SK}] Record successfully promoted to ${status}`);
        return { success: true };

    } catch (e) {
        if (e.name === "ConditionalCheckFailedException" || e.name === "TransactionCanceledException") {
            console.error(`[DB_ERROR] [${SK}] Record not found or PK/SK mismatch. Target PK: ${finalPK}`);
        } else {
            console.error(`[DB_FATAL_ERROR] [${SK}] ${e.message}`);
        }
        throw e;
    }
};