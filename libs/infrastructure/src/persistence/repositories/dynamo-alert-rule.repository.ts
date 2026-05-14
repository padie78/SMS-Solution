import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { IAlertRuleRepository, AlertRuleEntity, SingleTableWriteContext, TenantOrgContext } from '@sms/domain';
import { AlertRuleSingleTableMapper } from '../mappers/single-table-entity.mappers.js';
import { SingleTableEntityType } from '../entity-type.constants.js';
import { buildEntitySortKey } from '../tenancy-keys.js';
import { DynamoSingleTableRepositoryBase } from '../dynamo-repository.base.js';
import type { AlertRulePersistenceModel } from '../models/alert-rule.db-model.js';

export class DynamoAlertRuleRepository extends DynamoSingleTableRepositoryBase implements IAlertRuleRepository {
  constructor(doc: DynamoDBDocumentClient, tableName: string) {
    super(doc, tableName);
  }

  async getById(ctx: TenantOrgContext, alertRuleId: string): Promise<AlertRuleEntity | null> {
    const raw = await this.getByPkSk(
      this.partitionKey(ctx),
      buildEntitySortKey(SingleTableEntityType.ALERT_RULE, alertRuleId)
    );
    if (!raw) return null;
    return AlertRuleSingleTableMapper.toDomainEntity(this.hydratePersistenceRow(raw) as AlertRulePersistenceModel);
  }

  async put(entity: AlertRuleEntity, write: SingleTableWriteContext): Promise<void> {
    const model = AlertRuleSingleTableMapper.toPersistence(entity, write);
    await this.putRaw(AlertRuleSingleTableMapper.toDynamoAttributes(model));
  }

  async deleteById(ctx: TenantOrgContext, alertRuleId: string): Promise<void> {
    await this.deleteByPkSk(this.partitionKey(ctx), buildEntitySortKey(SingleTableEntityType.ALERT_RULE, alertRuleId));
  }
}
