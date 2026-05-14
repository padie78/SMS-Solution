import type { CostCenterEntity } from '@sms/domain';
import type { DomainAuditOmit, SingleTableInfrastructureFields } from './base-persistence.model.js';
import type { DomainDataOnly } from '../types/domain-snapshot.js';

export type CostCenterDbPayload = Omit<DomainDataOnly<CostCenterEntity>, DomainAuditOmit>;

export interface CostCenterDbModel extends SingleTableInfrastructureFields, CostCenterDbPayload {
  entityType: 'COST_CENTER';
}

export type CostCenterPersistenceModel = CostCenterDbModel;
