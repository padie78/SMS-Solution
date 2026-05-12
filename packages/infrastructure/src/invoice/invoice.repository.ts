import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  InvoiceEntity,
  InvoiceMapper,
  type InvoiceAuditEntry,
  type InvoicePersistence
} from '@sms/common';
import { BaseRepository } from '../repository/base.repository.js';

export type InvoiceRepositorySaveKeys = {
  PK: string;
  SK: string;
  entity_type?: string;
};

export class InvoiceRepository extends BaseRepository {
  constructor(docClient: DynamoDBDocumentClient, tableName: string) {
    super(docClient, tableName);
  }

  /**
   * Persiste una InvoiceEntity completa.
   */
  async save(entity: InvoiceEntity, keys: InvoiceRepositorySaveKeys): Promise<void> {
    if (!keys?.PK || !keys?.SK) {
      throw new Error('InvoiceRepository.save: keys.PK and keys.SK are required');
    }

    const payload = InvoiceMapper.toPersistence(entity);

    await this.putItem({
      ...keys,
      ...payload,
      entity_type: keys.entity_type ?? 'INVOICE_SNAPSHOT',
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Obtiene una factura y la instancia como Entidad.
   */
  async getById(pk: string, sk: string): Promise<InvoiceEntity | null> {
    const row = await this.getByKey({ PK: pk, SK: sk });
    if (!row) return null;

    const dto = InvoiceMapper.persistenceToDTO(row as unknown as InvoicePersistence);
    return InvoiceEntity.fromDTO(dto);
  }

  /**
   * Append atómico al audit trail (trazabilidad ESG).
   */
  async addAuditLog(keys: InvoiceRepositorySaveKeys, entry: InvoiceAuditEntry): Promise<void> {
    await this.doc.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: keys.PK, SK: keys.SK },
        UpdateExpression: 'SET at = list_append(if_not_exists(at, :empty), :item)',
        ExpressionAttributeValues: {
          ':item': [entry],
          ':empty': []
        }
      })
    );
  }
}
