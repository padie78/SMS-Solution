/**
 * @fileoverview Repository Layer - Acceso a datos para Configuración.
 * Implementa el patrón Single Table Design para el SMS.
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const ddb = DynamoDBDocumentClient.from(client);

const TABLE = process.env.TABLE_NAME || "sms-platform-dev-emissions";

/**
 * Helper para asegurar que las claves tengan el prefijo correcto
 */
const ensurePrefix = (val, prefix) => val.startsWith(prefix) ? val : `${prefix}${val}`;

export const repo = {
    /**
     * Guarda cualquier ítem de configuración (Org, Branch, User, Asset).
     * @param {Object} item - El objeto completo a persistir.
     */
    saveItem: async (item) => {
        // Normalización de claves para evitar inconsistencias en la tabla
        if (item.orgId) item.PK = ensurePrefix(item.orgId, 'ORG#');
        if (item.PK) item.PK = ensurePrefix(item.PK, 'ORG#');
        
        console.log(`[REPO][saveItem] Escribiendo en ${TABLE} -> PK: ${item.PK}, SK: ${item.SK}`);
        
        try {
            const params = {
                TableName: TABLE,
                Item: {
                    ...item,
                    updatedAt: new Date().toISOString() // Timestamp automático de auditoría
                }
            };
            
            return await ddb.send(new PutCommand(params));
        } catch (error) {
            console.error(`[REPO][saveItem] ERROR DynamoDB:`, error.message);
            throw new Error(`Error al persistir entidad ${item.SK} en la base de datos.`);
        }
    },

    /**
     * Recupera un ítem específico por su PK y SK.
     */
    getItem: async (pk, sk) => {
        const params = {
            TableName: TABLE,
            Key: {
                PK: ensurePrefix(pk, 'ORG#'),
                SK: sk
            }
        };
        try {
            const { Item } = await ddb.send(new GetCommand(params));
            return Item;
        } catch (error) {
            console.error(`[REPO][getItem] ERROR:`, error.message);
            throw error;
        }
    },
};