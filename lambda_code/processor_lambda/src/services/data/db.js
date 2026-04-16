import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";

/**
 * Persiste el borrador inicial (Draft) en DynamoDB.
 */
export const persistTransaction = async (record) => {
    // 1. Extraemos solo lo necesario para el log y validación
    const { PK, SK } = record; 
    const isoNow = new Date().toISOString();
    const currentStatus = "PENDING_REVIEW";

    console.log(`[DB] 📥 Ingestando Borrador: ${SK}`);

    try {
        await ddb.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: { 
                ...record,
                // 2. Sobrescribimos o aseguramos campos de control en la raíz
                // Usamos valores planos, lib-dynamodb se encarga del resto.
                processed_at: isoNow,
                total_days_prorated: 0, 
                
                // 3. Normalizamos el objeto metadata para que coincida con tu JSON
                metadata: {
                    ...record.metadata,
                    status: currentStatus,
                    // Si el record ya trae upload_date, lo mantenemos, sino usamos ahora.
                    upload_date: record.metadata?.upload_date || isoNow,
                    // Agregamos un flag extra para el Triage del Frontend
                    is_draft: true 
                }
            },
            // Evita duplicidad si S3 reintenta el evento
            ConditionExpression: "attribute_not_exists(SK)"
        }));

        console.log(`[DB] ✅ Registro persistido como ${currentStatus}`);
        return { success: true };

    } catch (error) {
        if (error.name === "ConditionalCheckFailedException") {
            console.warn(`[DB] ⚠️ Registro duplicado: ${SK}. Omitiendo.`);
            return { success: false, message: "Duplicate" };
        }
        
        console.error(`[DB] ❌ Error en DynamoDB para ${SK}:`, error);
        throw error;
    }
};