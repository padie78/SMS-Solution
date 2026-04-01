// 1. Importaciones ESM del AWS SDK v3
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

// 2. Configuración del Cliente (Fuera del handler para reutilizar TCP/HTTP connections)
const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const ddb = DynamoDBDocumentClient.from(client);

/**
 * Obtiene las estadísticas agregadas de una sede específica.
 * @param {string} orgId - ID de la organización.
 * @param {number} year - Año de auditoría.
 * @param {string} facilityId - ID de la sede (ej: CUPS o ID interno).
 */
export const getFacilityStats = async (orgId, year, facilityId) => {
    const params = {
        TableName: process.env.DYNAMO_TABLE,
        Key: {
            PK: `ORG#${orgId}`,
            SK: `STATS#${year}#FACILITY#${facilityId}`
        }
    };

    try {
        const response = await ddb.send(new GetCommand(params));
        return response.Item || null;
    } catch (error) {
        console.error(`❌ [DB_READER_ERROR]: Error al leer estadísticas de facility ${facilityId}`, error);
        throw error;
    }
};

/**
 * Lista las últimas facturas procesadas para una organización.
 * Nota: Implementamos una Query básica, asumiendo un GSI para mejor rendimiento.
 */
export const listInvoices = async (orgId, limit = 20) => {
    const params = {
        TableName: process.env.DYNAMO_TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
            ":pk": `ORG#${orgId}`,
            ":skPrefix": "INV#" // Asumiendo que las facturas tienen prefijo INV#
        },
        Limit: limit,
        ScanIndexForward: false // Para traer las más recientes primero
    };

    try {
        const response = await ddb.send(new QueryCommand(params));
        return response.Items || [];
    } catch (error) {
        console.error(`❌ [DB_READER_ERROR]: Error al listar facturas de organización ${orgId}`, error);
        throw error;
    }
};

// 3. Exportación por defecto para compatibilidad con el import de tu index.js
export default {
    getFacilityStats,
    listInvoices
};