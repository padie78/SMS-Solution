/**
 * Queries GSI_NodePath and updates path strings for subtree moves (path enumeration).
 */

import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { replaceLocationPathPrefix } from "./nodePathModel.js";

export const GSI_NODE_PATH_NAME = "GSI_NodePath";

/**
 * @param {import("@aws-sdk/lib-dynamodb").DynamoDBDocumentClient} docClient
 */
export async function queryItemsByHoldingAndPathPrefix(
  docClient,
  tableName,
  holdingId,
  pathPrefix
) {
  const items = [];
  let eks = undefined;
  do {
    const res = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: GSI_NODE_PATH_NAME,
        KeyConditionExpression: "holdingId = :hid AND begins_with(#pth , :pfx)",
        ExpressionAttributeNames: { "#pth": "path" },
        ExpressionAttributeValues: {
          ":hid": holdingId,
          ":pfx": pathPrefix,
        },
        ExclusiveStartKey: eks,
      })
    );
    items.push(...(res.Items ?? []));
    eks = res.LastEvaluatedKey;
  } while (eks);
  return items;
}

/**
 * For every descendant & self row sharing oldSubtreePrefix under holdingId,
 * substitutes the path prefix → newSubtreePrefix.
 *
 * @param {import("@aws-sdk/lib-dynamodb").DynamoDBDocumentClient} docClient
 */
export async function cascadeReplacePathPrefixUnderHolding(params) {
  const {
    docClient,
    tableName,
    holdingId,
    oldSubtreePrefix,
    newSubtreePrefix,
  } = params;

  const rows = await queryItemsByHoldingAndPathPrefix(
    docClient,
    tableName,
    holdingId,
    oldSubtreePrefix
  );
  const iso = new Date().toISOString();
  let mutated = 0;

  for (const row of rows) {
    if (!row.PK || !row.SK || row.path == null) continue;

    /** @type {string} */
    const nextPath = replaceLocationPathPrefix(
      /** @type {string} */ (row.path),
      oldSubtreePrefix,
      newSubtreePrefix
    );
    if (nextPath === row.path) continue;

    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { PK: row.PK, SK: row.SK },
        ConditionExpression: "attribute_exists(PK) AND begins_with(#pth , :op)",
        UpdateExpression: "SET #pth = :np, last_updated = :ts",
        ExpressionAttributeNames: { "#pth": "path" },
        ExpressionAttributeValues: {
          ":np": nextPath,
          ":op": oldSubtreePrefix,
          ":ts": iso,
        },
      })
    );
    mutated += 1;
  }

  return { scanned: rows.length, updated: mutated };
}
