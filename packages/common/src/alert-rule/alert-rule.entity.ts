import { SmsDomainError } from '../shared/sms-domain-error.js';
import type { AlertType } from '../shared/graphql-setup-enums.js';
import type { AlertRuleDTO } from './alert-rule.dto.js';

export class AlertRuleEntity {
  constructor(
    public readonly orgId: string,
    public readonly branchId: string,
    public readonly entityId: string,
    public readonly alertType: AlertType,
    public readonly name: string,
    public readonly status: AlertRuleDTO['status'],
    public readonly priority: AlertRuleDTO['priority'],
    public readonly threshold: number,
    public readonly operator: AlertRuleDTO['operator']
  ) {
    this.assertIdentity();
  }

  static fromMutation(
    orgId: string,
    branchId: string,
    entityId: string,
    alertType: AlertType,
    dto: AlertRuleDTO
  ): AlertRuleEntity {
    return new AlertRuleEntity(
      orgId,
      branchId,
      entityId,
      alertType,
      dto.name,
      dto.status,
      dto.priority,
      dto.threshold,
      dto.operator
    );
  }

  assertIdentity(): void {
    if (!this.orgId?.trim()) throw new SmsDomainError('AlertRule.orgId required');
    if (!this.branchId?.trim()) throw new SmsDomainError('AlertRule.branchId required');
    if (!this.entityId?.trim()) throw new SmsDomainError('AlertRule.entityId required');
    if (!this.name?.trim()) throw new SmsDomainError('AlertRule.name required');
  }

  toValue(): AlertRuleDTO {
    return {
      name: this.name,
      status: this.status,
      priority: this.priority,
      threshold: this.threshold,
      operator: this.operator
    };
  }
}
