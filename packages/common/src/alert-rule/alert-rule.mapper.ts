import type { SmsEntityTag } from '../shared/sms-entity-tag.js';
import type { AlertType } from '../shared/graphql-setup-enums.js';
import { AlertRuleEntity } from './alert-rule.entity.js';
import type { AlertRuleDTO } from './alert-rule.dto.js';

export interface AlertRulePersistence {
  sms_et: Extract<SmsEntityTag, 'ALR'>;
  org_id: string;
  br_id: string;
  ent_id: string;
  alert_ty: string;
  nm: string;
  st: string;
  pri: string;
  thr: number;
  op: string;
}

export const AlertRuleMapper = Object.freeze({
  dtoToEntity(
    orgId: string,
    branchId: string,
    entityId: string,
    alertType: AlertType,
    dto: AlertRuleDTO
  ): AlertRuleEntity {
    return AlertRuleEntity.fromMutation(orgId, branchId, entityId, alertType, dto);
  },

  toPersistence(entity: AlertRuleEntity): AlertRulePersistence {
    return {
      sms_et: 'ALR',
      org_id: entity.orgId,
      br_id: entity.branchId,
      ent_id: entity.entityId,
      alert_ty: entity.alertType,
      nm: entity.name,
      st: entity.status,
      pri: entity.priority,
      thr: entity.threshold,
      op: entity.operator
    };
  },

  persistenceToDTO(row: AlertRulePersistence): AlertRuleDTO {
    return {
      name: row.nm,
      status: row.st as AlertRuleDTO['status'],
      priority: row.pri as AlertRuleDTO['priority'],
      threshold: row.thr,
      operator: row.op as AlertRuleDTO['operator']
    };
  }
});
