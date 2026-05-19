import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { ICostCenterRepository, CostCenterEntity, SingleTableWriteContext, TenantOrgContext } from '@sms/domain';
import { CostCenterSingleTableMapper } from '../mappers/single-table-entity.mappers.js';
import { SingleTableEntityType } from '../entity-type.constants.js';
import { buildEntitySortKey } from '../tenancy-keys.js';
import { DynamoSingleTableRepositoryBase } from '../dynamo-repository.base.js';
import type { CostCenterPersistenceModel } from '../entities/cost-center.db-model.js';

export class DynamoCostCenterRepository extends DynamoSingleTableRepositoryBase implements ICostCenterRepository {
  constructor(doc: DynamoDBDocumentClient, tableName: string) {
    super(doc, tableName);
  }

  async getById(ctx: TenantOrgContext, costCenterId: string): Promise<CostCenterEntity | null> {
    const raw = await this.getByPkSk(
      this.partitionKey(ctx),
      buildEntitySortKey(SingleTableEntityType.COST_CENTER, costCenterId)
    );
    if (!raw) return null;
    return CostCenterSingleTableMapper.toDomainEntity(this.hydratePersistenceRow(raw) as CostCenterPersistenceModel);
  }

  async put(entity: CostCenterEntity, write: SingleTableWriteContext): Promise<void> {
    const model = CostCenterSingleTableMapper.toPersistence(entity, write);
    await this.putRaw(CostCenterSingleTableMapper.toDynamoAttributes(model));
  }

  async deleteById(ctx: TenantOrgContext, costCenterId: string): Promise<void> {
    await this.deleteByPkSk(this.partitionKey(ctx), buildEntitySortKey(SingleTableEntityType.COST_CENTER, costCenterId));
  }
}
