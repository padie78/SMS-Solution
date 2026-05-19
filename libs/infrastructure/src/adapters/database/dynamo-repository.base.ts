import { DeleteCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { TenantOrgContext } from '@sms/domain';
import { dynamoItemToPersistenceRecord } from './mappers/dynamo-serde.js';
import { buildTenantOrgPartitionKey } from './tenancy-keys.js';

export abstract class DynamoSingleTableRepositoryBase {
  constructor(
    protected readonly doc: DynamoDBDocumentClient,
    protected readonly tableName: string
  ) {}

  protected partitionKey(ctx: TenantOrgContext): string {
    return buildTenantOrgPartitionKey(ctx);
  }

  protected async getByPkSk(pk: string, sk: string): Promise<Record<string, unknown> | null> {
    const res = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk },
        ConsistentRead: false
      })
    );
    return (res.Item as Record<string, unknown> | undefined) ?? null;
  }

  protected async putRaw(item: Record<string, unknown>): Promise<void> {
    await this.doc.send(new PutCommand({ TableName: this.tableName, Item: item }));
  }

  protected async deleteByPkSk(pk: string, sk: string): Promise<void> {
    await this.doc.send(new DeleteCommand({ TableName: this.tableName, Key: { PK: pk, SK: sk } }));
  }

  protected hydratePersistenceRow(raw: Record<string, unknown>): unknown {
    return dynamoItemToPersistenceRecord(raw);
  }
}
