import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type {
  IEmissionFactorRepository,
  EmissionFactorEntity,
  SingleTableWriteContext,
  TenantOrgContext
} from '@sms/domain';
import { EmissionFactorSingleTableMapper } from '../mappers/single-table-entity.mappers.js';
import { SingleTableEntityType } from '../entity-type.constants.js';
import { buildEntitySortKey } from '../tenancy-keys.js';
import { DynamoSingleTableRepositoryBase } from '../dynamo-repository.base.js';
import type { EmissionFactorPersistenceModel } from '../entities/emission-factor.db-model.js';

export class DynamoEmissionFactorRepository extends DynamoSingleTableRepositoryBase implements IEmissionFactorRepository {
  constructor(doc: DynamoDBDocumentClient, tableName: string) {
    super(doc, tableName);
  }

  async getById(ctx: TenantOrgContext, emissionFactorId: string): Promise<EmissionFactorEntity | null> {
    const raw = await this.getByPkSk(
      this.partitionKey(ctx),
      buildEntitySortKey(SingleTableEntityType.EMISSION_FACTOR, emissionFactorId)
    );
    if (!raw) return null;
    return EmissionFactorSingleTableMapper.toDomainEntity(this.hydratePersistenceRow(raw) as EmissionFactorPersistenceModel);
  }

  async put(entity: EmissionFactorEntity, write: SingleTableWriteContext): Promise<void> {
    const model = EmissionFactorSingleTableMapper.toPersistence(entity, write);
    await this.putRaw(EmissionFactorSingleTableMapper.toDynamoAttributes(model));
  }

  async deleteById(ctx: TenantOrgContext, emissionFactorId: string): Promise<void> {
    await this.deleteByPkSk(
      this.partitionKey(ctx),
      buildEntitySortKey(SingleTableEntityType.EMISSION_FACTOR, emissionFactorId)
    );
  }
}
