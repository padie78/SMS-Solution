import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import {
  buildTenantOrgPartitionKey,
  normalizeParentIdPointer
} from "../dynamodb/tenantPartitionPk.js";
import { appendSegmentToLocationPath, normalizeSegmentId } from "../dynamodb/nodePathModel.js";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME =
  process.env.DYNAMO_TABLE || process.env.DATABASE_NAME || "sms-platform-dev-emissions";

/** @typedef {{ tenantId: string, organizationScopeId: string }} PartitionContext */

function buildPk(ctx) {
  return buildTenantOrgPartitionKey(ctx.tenantId, ctx.organizationScopeId);
}

export class ConfigServiceAdapter {
  /**
   * Obtiene un nodo por PK (tenant+org) y SK
   * @param {PartitionContext} ctx
   */
  async getNode(ctx, sk) {
    try {
      const pk = buildPk(ctx);
      if (!pk || !sk) return null;
      const res = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: pk, SK: sk },
          ConsistentRead: true
        })
      );
      return res.Item;
    } catch (error) {
      console.error("Error en getNode:", error);
      return null;
    }
  }

  /**
   * Crea un nodo (Put condicional — no sobreescribe si ya existe el par PK+SK).
   * @param {PartitionContext} ctx
   */
  async saveNode(ctx, input) {
    const timestamp = new Date().toISOString();
    const { id, parentId, nodeType, name, metadata = {} } = input;

    const cleanId = id ? normalizeSegmentId(id) : randomUUID().split("-")[0].toUpperCase();
    const sk = `${nodeType}#${cleanId}`;

    const parentPointer = normalizeParentIdPointer(parentId);

    let finalPath = appendSegmentToLocationPath(undefined, cleanId);
    if (parentPointer && parentPointer !== "ROOT") {
      const parentNode = await this.getNode(ctx, parentPointer);
      if (parentNode?.path) {
        finalPath = appendSegmentToLocationPath(parentNode.path, cleanId);
      }
    }

    let metaObj = metadata;
    if (typeof metaObj === "string") {
      try {
        metaObj = metaObj.trim() ? JSON.parse(metaObj) : {};
      } catch {
        metaObj = {};
      }
    }
    if (metaObj == null || typeof metaObj !== "object") {
      metaObj = {};
    }

    const pk = buildPk(ctx);
    if (!pk) {
      return { success: false, message: "PK inválida: revisa tenant u organización en claims", item: null };
    }

    const nodeTypeStr = String(nodeType);

    const item = {
      PK: pk,
      SK: sk,
      holdingId: pk,
      path: finalPath,
      nodeType: nodeTypeStr,
      /** Tipo de entidad de negocio (mismo valor que nodeType; atributo explícito String en Dynamo). */
      entityType: nodeTypeStr,
      name,
      parentId: parentPointer === "ROOT" ? "ROOT" : parentPointer,
      metadata: metaObj,
      last_updated: timestamp,
      entity_type: "NODE_CONFIG"
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: item,
          ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)"
        })
      );
    } catch (error) {
      if (error.name === "ConditionalCheckFailedException") {
        return {
          success: false,
          message: `Ya existe un nodo con SK=${sk} en esta partición (duplicado de ID).`,
          item: null
        };
      }
      console.error("Error en saveNode Put:", error);
      return { success: false, message: error.message, item: null };
    }

    return { success: true, id: sk, path: finalPath, item };
  }

  /**
   * @param {PartitionContext} ctx
   */
  async updateNode(ctx, sk, updateData) {
    const pk = buildPk(ctx);
    const timestamp = new Date().toISOString();

    const entries = Object.entries(updateData).filter(([_, v]) => v !== undefined);
    if (entries.length === 0) return { success: false, message: "No fields to update" };

    const updateExpressions = entries.map(([k, _], i) => `#field${i} = :val${i}`);
    const expressionAttributeNames = entries.reduce((acc, [k, _], i) => ({ ...acc, [`#field${i}`]: k }), {});
    const expressionAttributeValues = entries.reduce((acc, [_, v], i) => ({ ...acc, [`:val${i}`]: v }), { ":t": timestamp });

    const params = {
      TableName: TABLE_NAME,
      Key: { PK: pk, SK: sk },
      UpdateExpression: `SET ${updateExpressions.join(", ")}, last_updated = :t`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
      ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)"
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
   * @param {PartitionContext} ctx
   */
  async deleteNode(ctx, sk) {
    const pk = buildPk(ctx);
    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: pk,
        SK: sk
      },
      ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)"
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
   * @param {PartitionContext} ctx
   */
  async listNodes(ctx, filter) {
    const pk = buildPk(ctx);
    const holdingKey = pk;
    const { underPath, nodeType } = filter || {};
    const entityFilter = "entity_type = :et";
    const baseEav = {
      ":et": "NODE_CONFIG"
    };

    try {
      let res;
      if (underPath) {
        res = await docClient.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: "GSI_NodePath",
            KeyConditionExpression: "holdingId = :hid AND begins_with(#pth, :pref)",
            ExpressionAttributeNames: { "#pth": "path" },
            ExpressionAttributeValues: {
              ...baseEav,
              ":hid": holdingKey,
              ":pref": underPath
            },
            FilterExpression: entityFilter
          })
        );
      } else {
        res = await docClient.send(
          new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk",
            ExpressionAttributeValues: {
              ...baseEav,
              ":pk": pk
            },
            FilterExpression: entityFilter,
            ConsistentRead: true
          })
        );
      }

      let items = res.Items || [];
      if (nodeType) {
        items = items.filter((i) => i.nodeType === nodeType);
      }
      return items;
    } catch (error) {
      console.error("Error en listNodes:", error);
      return [];
    }
  }
}
