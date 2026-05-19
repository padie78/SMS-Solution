import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type {
  IInvoiceRepository,
  InvoiceEntity,
  InvoiceIaExtractedPatch,
  SingleTableWriteContext,
  TenantOrgContext
} from '@sms/domain';
import {
  InvoiceSingleTableMapper,
  mergeInvoiceBusinessBlobs,
  type InvoicePersistenceOptions
} from '../mappers/single-table-entity.mappers.js';
import { SingleTableEntityType } from '../entity-type.constants.js';
import { buildEntitySortKey } from '../tenancy-keys.js';
import { DynamoSingleTableRepositoryBase } from '../dynamo-repository.base.js';
import type { InvoicePersistenceModel } from '../entities/invoice.db-model.js';

export class DynamoInvoiceRepository extends DynamoSingleTableRepositoryBase implements IInvoiceRepository {
  constructor(doc: DynamoDBDocumentClient, tableName: string) {
    super(doc, tableName);
  }

  async getById(ctx: TenantOrgContext, invoiceId: string): Promise<InvoiceEntity | null> {
    const raw = await this.getByPkSk(this.partitionKey(ctx), buildEntitySortKey(SingleTableEntityType.INV, invoiceId));
    if (!raw) return null;
    return InvoiceSingleTableMapper.toDomainEntity(this.hydratePersistenceRow(raw) as InvoicePersistenceModel);
  }

  async put(
    entity: InvoiceEntity,
    write: SingleTableWriteContext,
    options?: InvoicePersistenceOptions
  ): Promise<void> {
    const model = InvoiceSingleTableMapper.toPersistence(entity, write, options);
    await this.putRaw(InvoiceSingleTableMapper.toDynamoAttributes(model));
  }

  async deleteById(ctx: TenantOrgContext, invoiceId: string): Promise<void> {
    await this.deleteByPkSk(this.partitionKey(ctx), buildEntitySortKey(SingleTableEntityType.INV, invoiceId));
  }

  async mergeIaExtractedData(
    ctx: TenantOrgContext,
    invoiceId: string,
    patch: InvoiceIaExtractedPatch,
    write: SingleTableWriteContext
  ): Promise<void> {
    const pk = this.partitionKey(ctx);
    const sk = buildEntitySortKey(SingleTableEntityType.INV, invoiceId);
    const raw = await this.getByPkSk(pk, sk);
    if (!raw) {
      throw new Error(`Invoice not found for mergeIaExtractedData: ${invoiceId}`);
    }
    const rec = this.hydratePersistenceRow(raw) as InvoicePersistenceModel;
    const mergedIa = mergeInvoiceBusinessBlobs(rec.iaExtractedData, patch);
    const next: InvoicePersistenceModel = {
      ...rec,
      iaExtractedData: mergedIa,
      _version: write.version,
      recordUpdatedAt: write.recordUpdatedAt
    };
    await this.putRaw(InvoiceSingleTableMapper.toDynamoAttributes(next));
  }
}
