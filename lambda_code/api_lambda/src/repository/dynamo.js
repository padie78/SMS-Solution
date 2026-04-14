/**
 * @fileoverview Repository Layer - Acceso a datos para Configuración.
 * Implementa persistencia robusta para el patrón Single Table Design (SMS).
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const ddb = DynamoDBDocumentClient.from(client);

const TABLE = process.env.TABLE_NAME || "sms-platform-dev-emissions";

/**
 * Normaliza el prefijo de la Partition Key.
 * Permite que el servicio envíe el UUID pelado o ya formateado.
 */
const formatPK = (id) => {
    if (!id) return null;
    return id.startsWith('ORG#') ? id : `ORG#${id}`;
};

export const repo = {
    /**
     * Guarda cualquier ítem de configuración (Org, Branch, User o Asset).
     * @param {Object} item - Objeto completo construido por el Service Layer.
     */
    saveItem: async (item) => {
        // 1. Aseguramos integridad de claves primarias
        item.PK = formatPK(item.PK || item.orgId);
        
        // 2. Limpieza de campos temporales (evitamos guardar orgId duplicado fuera de la PK si no es necesario)
        // Pero mantenemos entity_type y SK que son vitales.
        
        console.log(`[REPO][saveItem] Persistiendo Entidad: ${item.entity_type} | SK: ${item.SK}`);

        try {
            const params = {
                TableName: TABLE,
                Item: {
                    ...item,
                    // Timestamp de infraestructura (independiente de la lógica de negocio)
                    _internal_updated_at: new Date().toISOString()
                }
            };

            const result = await ddb.send(new PutCommand(params));
            return result;
        } catch (error) {
            console.error(`[REPO][saveItem] CRITICAL_ERROR:`, error.message);
            throw new Error(`Error de persistencia en DynamoDB para la entidad ${item.SK}`);
        }
    },

    /**
     * Obtiene un ítem por su clave primaria completa.
     */
    getItem: async (orgId, sk) => {
        const params = {
            TableName: TABLE,
            Key: {
                PK: formatPK(orgId),
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

    /**
     * Update parcial (útil para cambiar status de Assets o Roles de Usuario)
     */
    updateStatus: async (orgId, sk, newStatus) => {
        const params = {
            TableName: TABLE,
            Key: { PK: formatPK(orgId), SK: sk },
            UpdateExpression: "set #st = :s, last_updated = :u",
            ExpressionAttributeNames: { "#st": "status" },
            ExpressionAttributeValues: {
                ":s": newStatus,
                ":u": new Date().toISOString()
            },
            ReturnValues: "UPDATED_NEW"
        };
        return await ddb.send(new UpdateCommand(params));
    }
};