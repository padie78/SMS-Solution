import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type {
  IProductionLogRepository,
  ProductionLogEntity,
  SingleTableWriteContext,
  TenantOrgContext
} from '@sms/domain';
import { ProductionLogSingleTableMapper } from '../mappers/single-table-entity.mappers.js';
import { buildProductionLogSortKey } from '../tenancy-keys.js';
import { DynamoSingleTableRepositoryBase } from '../dynamo-repository.base.js';
import type { ProductionLogPersistenceModel } from '../entities/production-log.db-model.js';

export class DynamoProductionLogRepository extends DynamoSingleTableRepositoryBase implements IProductionLogRepository {
  constructor(doc: DynamoDBDocumentClient, tableName: string) {
    super(doc, tableName);
  }

  async getByBranchPeriod(ctx: TenantOrgContext, branchId: string, period: string): Promise<ProductionLogEntity | null> {
    const sk = buildProductionLogSortKey(branchId, period);
    const raw = await this.getByPkSk(this.partitionKey(ctx), sk);
    if (!raw) return null;
    return ProductionLogSingleTableMapper.toDomainEntity(this.hydratePersistenceRow(raw) as ProductionLogPersistenceModel);
  }

  async put(entity: ProductionLogEntity, write: SingleTableWriteContext): Promise<void> {
    const model = ProductionLogSingleTableMapper.toPersistence(entity, write);
    await this.putRaw(ProductionLogSingleTableMapper.toDynamoAttributes(model));
  }

  async deleteByBranchPeriod(ctx: TenantOrgContext, branchId: string, period: string): Promise<void> {
    await this.deleteByPkSk(this.partitionKey(ctx), buildProductionLogSortKey(branchId, period));
  }
}
