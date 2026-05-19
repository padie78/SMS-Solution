import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { IBuildingRepository, BuildingEntity, SingleTableWriteContext, TenantOrgContext } from '@sms/domain';
import { BuildingSingleTableMapper } from '../mappers/single-table-entity.mappers.js';
import { SingleTableEntityType } from '../entity-type.constants.js';
import { buildEntitySortKey } from '../tenancy-keys.js';
import { DynamoSingleTableRepositoryBase } from '../dynamo-repository.base.js';
import type { BuildingPersistenceModel } from '../entities/building.db-model.js';

export class DynamoBuildingRepository extends DynamoSingleTableRepositoryBase implements IBuildingRepository {
  constructor(doc: DynamoDBDocumentClient, tableName: string) {
    super(doc, tableName);
  }

  async getById(ctx: TenantOrgContext, buildingId: string): Promise<BuildingEntity | null> {
    const raw = await this.getByPkSk(this.partitionKey(ctx), buildEntitySortKey(SingleTableEntityType.SITE, buildingId));
    if (!raw) return null;
    return BuildingSingleTableMapper.toDomainEntity(this.hydratePersistenceRow(raw) as BuildingPersistenceModel);
  }

  async put(entity: BuildingEntity, write: SingleTableWriteContext): Promise<void> {
    const model = BuildingSingleTableMapper.toPersistence(entity, write);
    await this.putRaw(BuildingSingleTableMapper.toDynamoAttributes(model));
  }

  async deleteById(ctx: TenantOrgContext, buildingId: string): Promise<void> {
    await this.deleteByPkSk(this.partitionKey(ctx), buildEntitySortKey(SingleTableEntityType.SITE, buildingId));
  }
}
