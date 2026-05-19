import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { IUserRepository, UserEntity, SingleTableWriteContext, TenantOrgContext } from '@sms/domain';
import { UserSingleTableMapper } from '../mappers/single-table-entity.mappers.js';
import { SingleTableEntityType } from '../entity-type.constants.js';
import { buildEntitySortKey } from '../tenancy-keys.js';
import { DynamoSingleTableRepositoryBase } from '../dynamo-repository.base.js';
import type { UserPersistenceModel } from '../entities/user.db-model.js';

export class DynamoUserRepository extends DynamoSingleTableRepositoryBase implements IUserRepository {
  constructor(doc: DynamoDBDocumentClient, tableName: string) {
    super(doc, tableName);
  }

  async getById(ctx: TenantOrgContext, userId: string): Promise<UserEntity | null> {
    const raw = await this.getByPkSk(this.partitionKey(ctx), buildEntitySortKey(SingleTableEntityType.USER, userId));
    if (!raw) return null;
    return UserSingleTableMapper.toDomainEntity(this.hydratePersistenceRow(raw) as UserPersistenceModel);
  }

  async put(entity: UserEntity, write: SingleTableWriteContext): Promise<void> {
    const model = UserSingleTableMapper.toPersistence(entity, write);
    await this.putRaw(UserSingleTableMapper.toDynamoAttributes(model));
  }

  async deleteById(ctx: TenantOrgContext, userId: string): Promise<void> {
    await this.deleteByPkSk(this.partitionKey(ctx), buildEntitySortKey(SingleTableEntityType.USER, userId));
  }
}
