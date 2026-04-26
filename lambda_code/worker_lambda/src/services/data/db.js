import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";

export const persistTransaction = async (goldenRecord) => {
    const { PK, SK, extracted_data, climatiq_result, ai_analysis, metadata } = goldenRecord;
    const isoNow = new Date().toISOString();

    /**
     * 1. NORMALIZACIÓN DE PK (El "Fix" crítico)
     * Como el Dispatcher guardó el esqueleto sin "ORG#", 
     * nos aseguramos de usar el ID limpio para que el 
     * attribute_exists(PK) no falle.
     */
    const cleanPK = PK.replace("ORG#", "");

    // 2. SEGURIDAD: Valores por defecto para evitar NaN y errores de validación
    const billing = extracted_data?.billing_period || {};
    const startDate = new Date(billing.start || isoNow);
    const endDate = new Date(billing.end || isoNow);

    let diffTime = Math.abs(endDate - startDate);
    let totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    // Si las fechas son inválidas, totalDays sería NaN, forzamos a 1
    if (isNaN(totalDays)) totalDays = 1;

    console.log(`📊 [DB_EXEC] PK_Original: ${PK} | PK_Limpia: ${cleanPK} | SK: ${SK} | Days: ${totalDays}`);

    // 3. PREPARACIÓN DEL UPDATE
    const masterUpdate = {
        Update: {
            TableName: TABLE_NAME,
            Key: { 
                PK: cleanPK, // Usamos la PK corregida
                SK: SK 
            },
            UpdateExpression: `SET 
                #st = :done, 
                ai_analysis = :ai, 
                climatiq_result = :cr, 
                extracted_data = :ed, 
                processed_at = :now,
                total_days_prorated = :days,
                metadata = :meta`,
            // Verificamos existencia. Si falla aquí es porque la SK o PK están mal escritas.
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
                    ...(metadata || {}),
                    processed_at: isoNow,
                    status: "VALIDATED",
                    is_draft: false
                }
            }
        }
    };

    try {
        // 4. EJECUCIÓN
        // Por ahora solo el masterUpdate para asegurar que el registro base cambie a DONE
        await ddb.send(new TransactWriteCommand({ 
            TransactItems: [masterUpdate] 
        }));

        console.log(`✅ [DB] | Invoice ${SK} actualizada a DONE.`);
        return { success: true };

    } catch (e) {
        if (e.name === "TransactionCanceledException") {
            console.error("❌ [CANCEL_REASONS]:", JSON.stringify(e.CancellationReasons));
            // Si ves "ConditionalCheckFailed" aquí, es que cleanPK + SK no existen en la tabla.
        }
        throw e;
    }
};