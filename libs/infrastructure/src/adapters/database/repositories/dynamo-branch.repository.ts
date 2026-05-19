import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { IBranchRepository, BranchEntity, SingleTableWriteContext, TenantOrgContext } from '@sms/domain';
import { BranchSingleTableMapper } from '../mappers/single-table-entity.mappers.js';
import { SingleTableEntityType } from '../entity-type.constants.js';
import { buildEntitySortKey } from '../tenancy-keys.js';
import { DynamoSingleTableRepositoryBase } from '../dynamo-repository.base.js';
import type { BranchPersistenceModel } from '../entities/branch.db-model.js';

export class DynamoBranchRepository extends DynamoSingleTableRepositoryBase implements IBranchRepository {
  constructor(doc: DynamoDBDocumentClient, tableName: string) {
    super(doc, tableName);
  }

  async getById(ctx: TenantOrgContext, branchId: string): Promise<BranchEntity | null> {
    const raw = await this.getByPkSk(this.partitionKey(ctx), buildEntitySortKey(SingleTableEntityType.BRANCH, branchId));
    if (!raw) return null;
    return BranchSingleTableMapper.toDomainEntity(this.hydratePersistenceRow(raw) as BranchPersistenceModel);
  }

  async put(entity: BranchEntity, write: SingleTableWriteContext): Promise<void> {
    const model = BranchSingleTableMapper.toPersistence(entity, write);
    await this.putRaw(BranchSingleTableMapper.toDynamoAttributes(model));
  }

  async deleteById(ctx: TenantOrgContext, branchId: string): Promise<void> {
    await this.deleteByPkSk(this.partitionKey(ctx), buildEntitySortKey(SingleTableEntityType.BRANCH, branchId));
  }
}
