import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

/**
 * Repositorio genérico DynamoDB (patrón adaptador de persistencia).
 * Subclases aportan semántica de agregado (PK/SK, GSIs).
 * @template T
 */
export class BaseRepository {
  /**
   * @param {import('@aws-sdk/lib-dynamodb').DynamoDBDocumentClient} docClient
   * @param {string} tableName
   */
  constructor(docClient, tableName) {
    if (!docClient) throw new Error('BaseRepository: docClient is required');
    if (!tableName?.trim()) throw new Error('BaseRepository: tableName is required');
    this.doc = docClient;
    this.tableName = tableName;
  }

  /**
   * @param {Record<string, unknown>} key
   * @returns {Promise<Record<string, unknown> | null>}
   */
  async getByKey(key) {
    const out = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: key,
        ConsistentRead: false
      })
    );
    return out.Item ?? null;
  }

  /**
   * @param {Record<string, unknown>} item
   */
  async putItem(item) {
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item
      })
    );
  }

  /**
   * @param {Record<string, unknown>} key
   */
  async deleteByKey(key) {
    await this.doc.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: key
      })
    );
  }

  /**
   * Query simple por partition key (sin paginación expuesta; extender si hace falta).
   * @param {string} partitionKeyAttr
   * @param {string} partitionKeyValue
   * @param {{ limit?: number }} [options]
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async queryByPartitionKey(partitionKeyAttr, partitionKeyValue, options = {}) {
    const { limit = 100 } = options;
    const out = await this.doc.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: '#pk = :pk',
        ExpressionAttributeNames: { '#pk': partitionKeyAttr },
        ExpressionAttributeValues: { ':pk': partitionKeyValue },
        Limit: limit
      })
    );
    return out.Items ?? [];
  }
}
