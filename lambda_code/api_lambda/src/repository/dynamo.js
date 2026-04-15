/**
 * @fileoverview Repository Layer - Acceso a datos para Configuración.
 * Implementa persistencia robusta para el patrón Single Table Design (SMS).
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const ddb = DynamoDBDocumentClient.from(client);

const TABLE = process.env.TABLE_NAME || "sms-platform-dev-emissions";

/**
 * Normaliza el prefijo de la Partition Key.
 */
const formatPK = (id) => {
    if (!id) return null;
    return id.startsWith('ORG#') ? id : `ORG#${id}`;
};

export const repo = {
    /**
     * Guarda o actualiza cualquier entidad de configuración.
     * Soporta Org, Branch, User, Asset, CostCenter, Tariff y ProductionLog.
     */
    saveItem: async (item) => {
        const pk = formatPK(item.PK);
        
        console.log(`[REPO][saveItem] Persistiendo: ${item.entity_type} | SK: ${item.SK}`);

        try {
            const params = {
                TableName: TABLE,
                Item: {
                    ...item,
                    PK: pk, // Aseguramos formato correcto
                    _internal_updated_at: new Date().toISOString()
                }
            };

            await ddb.send(new PutCommand(params));
            return { success: true, sk: item.SK };
        } catch (error) {
            console.error(`[REPO][saveItem] CRITICAL_ERROR:`, error.message);
            throw new Error(`Error de persistencia: ${item.SK}`);
        }
    },

    /**
     * Obtiene una entidad específica por PK y SK.
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
     * Actualización específica para el flujo de aprobación de facturas.
     * Maneja el alias de "status" para evitar conflictos con palabras reservadas.
     */
    updateInvoiceStatus: async (orgId, sk, status, userEmail) => {
        const timestamp = new Date().toISOString();
        const params = {
            TableName: TABLE,
            Key: { PK: formatPK(orgId), SK: sk },
            UpdateExpression: "SET #st = :s, approved_by = :u, last_updated = :t, _internal_updated_at = :t",
            ExpressionAttributeNames: { 
                "#st": "status" 
            },
            ExpressionAttributeValues: {
                ":s": status,
                ":u": userEmail,
                ":t": timestamp
            },
            ReturnValues: "ALL_NEW"
        };

        try {
            const { Attributes } = await ddb.send(new UpdateCommand(params));
            return Attributes;
        } catch (error) {
            console.error(`[REPO][updateInvoiceStatus] ERROR:`, error.message);
            throw error;
        }
    },

    /**
     * Eliminación física de registros (Assets, Branches, etc).
     */
    deleteItem: async (orgId, sk) => {
        console.log(`[REPO][deleteItem] Eliminando SK: ${sk}`);
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