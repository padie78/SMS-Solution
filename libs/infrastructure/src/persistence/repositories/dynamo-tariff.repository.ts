import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { ITariffRepository, TariffEntity, SingleTableWriteContext, TenantOrgContext } from '@sms/domain';
import { TariffSingleTableMapper } from '../mappers/single-table-entity.mappers.js';
import { SingleTableEntityType } from '../entity-type.constants.js';
import { buildEntitySortKey } from '../tenancy-keys.js';
import { DynamoSingleTableRepositoryBase } from '../dynamo-repository.base.js';
import type { TariffPersistenceModel } from '../models/tariff.db-model.js';

export class DynamoTariffRepository extends DynamoSingleTableRepositoryBase implements ITariffRepository {
  constructor(doc: DynamoDBDocumentClient, tableName: string) {
    super(doc, tableName);
  }

  async getById(ctx: TenantOrgContext, tariffId: string): Promise<TariffEntity | null> {
    const raw = await this.getByPkSk(this.partitionKey(ctx), buildEntitySortKey(SingleTableEntityType.TARIFF, tariffId));
    if (!raw) return null;
    return TariffSingleTableMapper.toDomainEntity(this.hydratePersistenceRow(raw) as TariffPersistenceModel);
  }

  async put(entity: TariffEntity, write: SingleTableWriteContext): Promise<void> {
    const model = TariffSingleTableMapper.toPersistence(entity, write);
    await this.putRaw(TariffSingleTableMapper.toDynamoAttributes(model));
  }

  async deleteById(ctx: TenantOrgContext, tariffId: string): Promise<void> {
    await this.deleteByPkSk(this.partitionKey(ctx), buildEntitySortKey(SingleTableEntityType.TARIFF, tariffId));
  }
}
