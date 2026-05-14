import type { AlertRuleEntity } from '@sms/domain';
import type { DomainAuditOmit, SingleTableInfrastructureFields } from './base-persistence.model.js';
import type { DomainDataOnly } from '../types/domain-snapshot.js';

export type AlertRuleDbPayload = Omit<DomainDataOnly<AlertRuleEntity>, 'entityType' | DomainAuditOmit> & {
  monitoredEntityType: AlertRuleEntity['entityType'];
};

export interface AlertRuleDbModel extends SingleTableInfrastructureFields, AlertRuleDbPayload {
  entityType: 'ALERT_RULE';
}

export type AlertRulePersistenceModel = AlertRuleDbModel;
