import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { IAssetRepository, AssetEntity, SingleTableWriteContext, TenantOrgContext } from '@sms/domain';
import { AssetSingleTableMapper } from '../mappers/single-table-entity.mappers.js';
import { SingleTableEntityType } from '../entity-type.constants.js';
import { buildEntitySortKey } from '../tenancy-keys.js';
import { DynamoSingleTableRepositoryBase } from '../dynamo-repository.base.js';
import type { AssetPersistenceModel } from '../models/asset.db-model.js';

export class DynamoAssetRepository extends DynamoSingleTableRepositoryBase implements IAssetRepository {
  constructor(doc: DynamoDBDocumentClient, tableName: string) {
    super(doc, tableName);
  }

  async getById(ctx: TenantOrgContext, assetId: string): Promise<AssetEntity | null> {
    const raw = await this.getByPkSk(this.partitionKey(ctx), buildEntitySortKey(SingleTableEntityType.ASSET, assetId));
    if (!raw) return null;
    return AssetSingleTableMapper.toDomainEntity(this.hydratePersistenceRow(raw) as AssetPersistenceModel);
  }

  async put(entity: AssetEntity, write: SingleTableWriteContext): Promise<void> {
    const model = AssetSingleTableMapper.toPersistence(entity, write);
    await this.putRaw(AssetSingleTableMapper.toDynamoAttributes(model));
  }

  async deleteById(ctx: TenantOrgContext, assetId: string): Promise<void> {
    await this.deleteByPkSk(this.partitionKey(ctx), buildEntitySortKey(SingleTableEntityType.ASSET, assetId));
  }
}
