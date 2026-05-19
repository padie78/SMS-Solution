import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { IMeterRepository, MeterEntity, SingleTableWriteContext, TenantOrgContext } from '@sms/domain';
import { MeterSingleTableMapper } from '../mappers/single-table-entity.mappers.js';
import { SingleTableEntityType } from '../entity-type.constants.js';
import { buildEntitySortKey } from '../tenancy-keys.js';
import { DynamoSingleTableRepositoryBase } from '../dynamo-repository.base.js';
import type { MeterPersistenceModel } from '../entities/meter.db-model.js';

export class DynamoMeterRepository extends DynamoSingleTableRepositoryBase implements IMeterRepository {
  constructor(doc: DynamoDBDocumentClient, tableName: string) {
    super(doc, tableName);
  }

  async getById(ctx: TenantOrgContext, meterId: string): Promise<MeterEntity | null> {
    const raw = await this.getByPkSk(this.partitionKey(ctx), buildEntitySortKey(SingleTableEntityType.METER, meterId));
    if (!raw) return null;
    return MeterSingleTableMapper.toDomainEntity(this.hydratePersistenceRow(raw) as MeterPersistenceModel);
  }

  async put(entity: MeterEntity, write: SingleTableWriteContext): Promise<void> {
    const model = MeterSingleTableMapper.toPersistence(entity, write);
    await this.putRaw(MeterSingleTableMapper.toDynamoAttributes(model));
  }

  async deleteById(ctx: TenantOrgContext, meterId: string): Promise<void> {
    await this.deleteByPkSk(this.partitionKey(ctx), buildEntitySortKey(SingleTableEntityType.METER, meterId));
  }
}
