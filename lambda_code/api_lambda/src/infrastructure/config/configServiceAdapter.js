import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  QueryCommand, 
  UpdateCommand 
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { appendSegmentToLocationPath, normalizeSegmentId } from "../dynamodb/nodePathModel.js";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DATABASE_NAME || "sms-platform-dev-emissions";

export class ConfigServiceAdapter {
  
  /**
   * Obtiene un nodo por su PK y SK
   */
  async getNode(orgId, sk) {
    try {
      const res = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `ORG#${orgId}`, SK: sk }
      }));
      return res.Item;
    } catch (error) {
      console.error("Error en getNode:", error);
      return null;
    }
  }

  /**
   * Crea o reemplaza un nodo (Polimórfico)
   */
  async saveNode(orgId, input) {
    const timestamp = new Date().toISOString();
    const { id, parentId, nodeType, name, metadata = {} } = input;

    const cleanId = id ? normalizeSegmentId(id) : randomUUID().split('-')[0].toUpperCase();
    const sk = `${nodeType}#${cleanId}`;

    // Resolución de PATH
    let finalPath = appendSegmentToLocationPath(undefined, cleanId);
    if (parentId && parentId !== "ROOT") {
      const parentNode = await configServiceAdapter.getNode(orgId, parentId);
      if (parentNode?.path) {
        finalPath = appendSegmentToLocationPath(parentNode.path, cleanId);
      }
    }

    const item = {
      PK: `ORG#${orgId}`,
      SK: sk,
      path: finalPath,
      nodeType,
      name,
      parentId: parentId || "ROOT",
      metadata: typeof metadata === 'string' ? JSON.parse(metadata) : metadata,
      last_updated: timestamp,
      entity_type: "NODE_CONFIG"
    };

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    return { success: true, id: sk, path: finalPath, item };
  }

  /**
   * UPDATE GENÉRICO
   * Corregido: Se eliminó el casteo de tipo 'as const' y 'params: any'
   */
  async updateNode(orgId, sk, updateData) {
    const timestamp = new Date().toISOString();
    
    // Filtramos campos undefined y preparamos la actualización
    const entries = Object.entries(updateData).filter(([_, v]) => v !== undefined);
    if (entries.length === 0) return { success: false, message: "No fields to update" };

    const updateExpressions = entries.map(([k, _], i) => `#field${i} = :val${i}`);
    const expressionAttributeNames = entries.reduce((acc, [k, _], i) => ({ ...acc, [`#field${i}`]: k }), {});
    const expressionAttributeValues = entries.reduce((acc, [_, v], i) => ({ ...acc, [`:val${i}`]: v }), { ":t": timestamp });

    const params = {
      TableName: TABLE_NAME,
      Key: { PK: `ORG#${orgId}`, SK: sk },
      UpdateExpression: `SET ${updateExpressions.join(", ")}, last_updated = :t`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
      ConditionExpression: "attribute_exists(PK)"
    };

    try {
      const res = await docClient.send(new UpdateCommand(params));
      return { success: true, data: res.Attributes };
    } catch (error) {
      console.error("Error en updateNode:", error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Elimina un nodo específico.
   * @param {string} orgId 
   * @param {string} sk 
   */
  async deleteNode(orgId, sk) {
    const params = {
      TableName: TABLE_NAME,
      Key: { 
        PK: `ORG#${orgId}`, 
        SK: sk 
      },
      ConditionExpression: "attribute_exists(PK)" // Solo borra si existe
    };

    try {
      await docClient.send(new DeleteCommand(params));
      return { success: true };
    } catch (error) {
      if (error.name === "ConditionalCheckFailedException") {
        return { success: false, message: "El nodo no existe." };
      }
      console.error("Error en deleteNode:", error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Listar nodos (Jerarquía funcional)
   */
  async listNodes(orgId, filter) {
    const { underPath, nodeType } = filter || {};
    
    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": `ORG#${orgId}` }
    };

    if (underPath) {
      params.KeyConditionExpression += " AND begins_with(path, :p)";
      params.ExpressionAttributeValues[":p"] = underPath;
    }

    try {
      const res = await docClient.send(new QueryCommand(params));
      let items = res.Items || [];

      if (nodeType) {
        items = items.filter(i => i.nodeType === nodeType);
      }

      return items;
    } catch (error) {
      console.error("Error en listNodes:", error);
      return [];
    }
  }
}