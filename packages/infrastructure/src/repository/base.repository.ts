import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export type QueryByPartitionKeyOptions = {
  limit?: number;
};

/**
 * Repositorio genérico DynamoDB (patrón adaptador de persistencia).
 * Subclases aportan semántica de agregado (PK/SK, GSIs).
 */
export class BaseRepository {
  protected readonly doc: DynamoDBDocumentClient;
  protected readonly tableName: string;

  constructor(docClient: DynamoDBDocumentClient, tableName: string) {
    if (!docClient) throw new Error('BaseRepository: docClient is required');
    if (!tableName?.trim()) throw new Error('BaseRepository: tableName is required');
    this.doc = docClient;
    this.tableName = tableName;
  }

  async getByKey(key: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    const out = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: key,
        ConsistentRead: false
      })
    );
    return out.Item ?? null;
  }

  async putItem(item: Record<string, unknown>): Promise<void> {
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item
      })
    );
  }

  async deleteByKey(key: Record<string, unknown>): Promise<void> {
    await this.doc.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: key
      })
    );
  }

  /**
   * Query simple por partition key (sin paginación expuesta; extender si hace falta).
   */
  async queryByPartitionKey(
    partitionKeyAttr: string,
    partitionKeyValue: string,
    options: QueryByPartitionKeyOptions = {}
  ): Promise<Record<string, unknown>[]> {
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
