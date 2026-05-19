import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { IOrgConfigRepository, OrgConfigEntity, SingleTableWriteContext, TenantOrgContext } from '@sms/domain';
import { OrgConfigSingleTableMapper } from '../mappers/single-table-entity.mappers.js';
import { SingleTableEntityType } from '../entity-type.constants.js';
import { buildEntitySortKey, buildTenantOrgPartitionKey } from '../tenancy-keys.js';
import { DynamoSingleTableRepositoryBase } from '../dynamo-repository.base.js';
import type { OrgConfigPersistenceModel } from '../entities/org-config.db-model.js';

export class DynamoOrgConfigRepository extends DynamoSingleTableRepositoryBase implements IOrgConfigRepository {
  constructor(doc: DynamoDBDocumentClient, tableName: string) {
    super(doc, tableName);
  }

  async getByOrgId(ctx: TenantOrgContext, orgId: string): Promise<OrgConfigEntity | null> {
    const pk = buildTenantOrgPartitionKey({ tenantId: ctx.tenantId, orgId });
    const raw = await this.getByPkSk(pk, buildEntitySortKey(SingleTableEntityType.ORG_CONFIG, orgId));
    if (!raw) return null;
    return OrgConfigSingleTableMapper.toDomainEntity(this.hydratePersistenceRow(raw) as OrgConfigPersistenceModel);
  }

  async put(entity: OrgConfigEntity, write: SingleTableWriteContext): Promise<void> {
    const model = OrgConfigSingleTableMapper.toPersistence(entity, write);
    await this.putRaw(OrgConfigSingleTableMapper.toDynamoAttributes(model));
  }

  async deleteByOrgId(ctx: TenantOrgContext, orgId: string): Promise<void> {
    const pk = buildTenantOrgPartitionKey({ tenantId: ctx.tenantId, orgId });
    await this.deleteByPkSk(pk, buildEntitySortKey(SingleTableEntityType.ORG_CONFIG, orgId));
  }
}
