/**
 * @fileoverview Repository Layer - Acceso a datos para Configuración.
 * Implementa persistencia robusta para el patrón Single Table Design (SMS).
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const ddb = DynamoDBDocumentClient.from(client);

const TABLE = process.env.TABLE_NAME || "sms-platform-dev-emissions";

const formatPK = (id) => {
    if (!id) return null;
    return id.startsWith('ORG#') ? id : `ORG#${id}`;
};

export const repo = {
    /**
     * Guarda un item completo (Upsert).
     * Ideal para creaciones o reemplazos totales.
     */
    saveItem: async (item) => {
        const params = {
            TableName: TABLE,
            Item: {
                ...item,
                PK: formatPK(item.PK),
                _internal_updated_at: new Date().toISOString()
            }
        };

        try {
            await ddb.send(new PutCommand(params));
            return { success: true, sk: item.SK };
        } catch (error) {
            console.error(`[REPO][saveItem] ERROR:`, error.message);
            throw new Error(`Error de persistencia: ${item.SK}`);
        }
    },

    /**
     * Obtiene un item por su clave primaria compuesta.
     */
    getItem: async (orgId, sk) => {
        try {
            const { Item } = await ddb.send(new GetCommand({
                TableName: TABLE,
                Key: { PK: formatPK(orgId), SK: sk }
            }));
            return Item;
        } catch (error) {
            console.error(`[REPO][getItem] ERROR:`, error.message);
            throw error;
        }
    },

    /**
     * UPDATE GENÉRICO (La joya de la corona)
     * Permite actualizar solo los campos enviados sin leer el item previamente.
     */
    updateItem: async (orgId, sk, data) => {
        const timestamp = new Date().toISOString();
        const entries = Object.entries(data).filter(([_, v]) => v !== undefined);
        
        if (entries.length === 0) return null;

        // Construcción dinámica de la expresión
        const updateParts = entries.map(([k, _], i) => `#f${i} = :v${i}`);
        const attrNames = entries.reduce((acc, [k, _], i) => ({ ...acc, [`#f${i}`]: k }), {});
        const attrValues = entries.reduce((acc, [_, v], i) => ({ ...acc, [`:v${i}`]: v }), { ":t": timestamp });

        const params = {
            TableName: TABLE,
            Key: { PK: formatPK(orgId), SK: sk },
            UpdateExpression: `SET ${updateParts.join(", ")}, _internal_updated_at = :t`,
            ExpressionAttributeNames: attrNames,
            ExpressionAttributeValues: attrValues,
            ReturnValues: "ALL_NEW"
        };

        try {
            const { Attributes } = await ddb.send(new UpdateCommand(params));
            return Attributes;
        } catch (error) {
            console.error(`[REPO][updateItem] ERROR:`, error.message);
            throw error;
        }
    },

    /**
     * Query genérico para búsquedas por Partition Key.
     */
    queryByPK: async (orgId, options = {}) => {
        const { skBeginsWith } = options;
        const params = {
            TableName: TABLE,
            KeyConditionExpression: "PK = :pk",
            ExpressionAttributeValues: { ":pk": formatPK(orgId) }
        };

        if (skBeginsWith) {
            params.KeyConditionExpression += " AND begins_with(SK, :sk)";
            params.ExpressionAttributeValues[":sk"] = skBeginsWith;
        }

        try {
            const { Items } = await ddb.send(new QueryCommand(params));
            return Items || [];
        } catch (error) {
            console.error(`[REPO][queryByPK] ERROR:`, error.message);
            throw error;
        }
    },

    /**
     * Eliminación de registros.
     */
    deleteItem: async (orgId, sk) => {
        try {
            await ddb.send(new DeleteCommand({
                TableName: TABLE,
                Key: { PK: formatPK(orgId), SK: sk }
            }));
            return { success: true };
        } catch (error) {
            console.error(`[REPO][deleteItem] ERROR:`, error.message);
            throw error;
        }
    }
};