import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { IRegionRepository, RegionEntity, SingleTableWriteContext, TenantOrgContext } from '@sms/domain';
import { RegionSingleTableMapper } from '../mappers/single-table-entity.mappers.js';
import { SingleTableEntityType } from '../entity-type.constants.js';
import { buildEntitySortKey } from '../tenancy-keys.js';
import { DynamoSingleTableRepositoryBase } from '../dynamo-repository.base.js';
import type { RegionPersistenceModel } from '../models/region.db-model.js';

export class DynamoRegionRepository extends DynamoSingleTableRepositoryBase implements IRegionRepository {
  constructor(doc: DynamoDBDocumentClient, tableName: string) {
    super(doc, tableName);
  }

  async getById(ctx: TenantOrgContext, regionId: string): Promise<RegionEntity | null> {
    const raw = await this.getByPkSk(this.partitionKey(ctx), buildEntitySortKey(SingleTableEntityType.REGION, regionId));
    if (!raw) return null;
    return RegionSingleTableMapper.toDomainEntity(this.hydratePersistenceRow(raw) as RegionPersistenceModel);
  }

  async put(entity: RegionEntity, write: SingleTableWriteContext): Promise<void> {
    const model = RegionSingleTableMapper.toPersistence(entity, write);
    await this.putRaw(RegionSingleTableMapper.toDynamoAttributes(model));
  }

  async deleteById(ctx: TenantOrgContext, regionId: string): Promise<void> {
    await this.deleteByPkSk(this.partitionKey(ctx), buildEntitySortKey(SingleTableEntityType.REGION, regionId));
  }
}
