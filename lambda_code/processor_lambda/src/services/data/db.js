import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";

/**
 * Persiste el borrador inicial (Draft) en DynamoDB.
 * Mantiene la estructura del objeto pero inicializa valores en 0/vacío.
 */
export const persistTransaction = async (record) => {
    const { PK, SK, metadata } = record;
    const isoNow = new Date().toISOString();

    // Extraemos el status del metadata o usamos PENDING_REVIEW por defecto
    const currentStatus = "PENDING_REVIEW";

    console.log(`[DB] 📥 Ingestando Borrador: ${SK} | Org: ${PK}`);

    try {
        await ddb.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: { 
                ...record,
                // Forzamos metadatos de control de ingesta
                processed_at: isoNow,
                total_days_prorated: 0, 
                // Aseguramos que el status sea el correcto para el dashboard
                metadata: {
                    ...record.metadata,
                    status: currentStatus,
                    upload_date: record.metadata?.upload_date || isoNow
                }
            },
            // Evita que un re-intento de S3 pise un registro que quizás ya está en proceso
            ConditionExpression: "attribute_not_exists(SK)"
        }));

        console.log(`[DB] ✅ Registro persistido exitosamente en estado: ${currentStatus}`);
        return { success: true };

    } catch (error) {
        if (error.name === "ConditionalCheckFailedException") {
            console.warn(`[DB] ⚠️ Duplicado detectado: El registro ${SK} ya existe en la tabla.`);
            return { success: false, message: "Duplicate" };
        }
        
        console.error(`[DB] ❌ Error de escritura en DynamoDB:`, error);
        throw error;
    }
};