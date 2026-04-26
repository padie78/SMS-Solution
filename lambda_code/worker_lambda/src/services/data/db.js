import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";
import { buildStatsOps } from "./operations.js";
export const persistTransaction = async (goldenRecord) => {
    const { PK, SK, extracted_data, climatiq_result, ai_analysis, metadata } = goldenRecord;
    const isoNow = new Date().toISOString();

    // SEGURIDAD: Valores por defecto para evitar NaN
    const billing = extracted_data?.billing_period || {};
    const startDate = new Date(billing.start || isoNow);
    const endDate = new Date(billing.end || isoNow);

    let diffTime = Math.abs(endDate - startDate);
    let totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    // Si las fechas son nulas o inválidas, forzamos a 1 para que no sea NaN
    if (isNaN(totalDays)) totalDays = 1;

    console.log(`📊 [DEBUG_DB] PK: ${PK}, SK: ${SK}, Days: ${totalDays}`);

    const masterUpdate = {
        Update: {
            TableName: TABLE_NAME,
            Key: { PK, SK },
            UpdateExpression: `SET 
                #st = :done, 
                ai_analysis = :ai, 
                climatiq_result = :cr, 
                extracted_data = :ed, 
                processed_at = :now,
                total_days_prorated = :days,
                metadata = :meta`,
            ConditionExpression: "attribute_exists(PK)", 
            ExpressionAttributeNames: { "#st": "status" },
            ExpressionAttributeValues: {
                ":done": "DONE",
                ":ai": ai_analysis || {},
                ":cr": climatiq_result || {},
                ":ed": extracted_data || {},
                ":now": isoNow,
                ":days": totalDays,
                ":meta": {
                    ...metadata,
                    processed_at: isoNow,
                    status: "VALIDATED",
                    is_draft: false
                }
            }
        }
    };

    try {
        // PRUEBA DE FUEGO: Solo el masterUpdate primero para descartar que sea statsOps
        // Si esto funciona, el problema está en la generación de las estadísticas.
        await ddb.send(new TransactWriteCommand({ 
            TransactItems: [masterUpdate] 
        }));

        console.log(`✅ [DB] | Registro maestro actualizado correctamente.`);
        
        // Aquí podrías procesar las statsOps por separado si quisieras
        return { success: true };

    } catch (e) {
        // ESTO ES LO MÁS IMPORTANTE AHORA:
        if (e.name === "TransactionCanceledException") {
            console.error("❌ [CANCEL_REASONS]:", JSON.stringify(e.CancellationReasons));
        }
        throw e;
    }
};