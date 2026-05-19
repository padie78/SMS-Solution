import type { BranchEntity } from '@sms/domain';
import type { DomainAuditOmit, SingleTableInfrastructureFields } from './single-table-record.entity.js';
import type { DomainDataOnly } from '../types/domain-snapshot.js';

export type BranchDbPayload = Omit<DomainDataOnly<BranchEntity>, DomainAuditOmit>;

export interface BranchDbModel extends SingleTableInfrastructureFields, BranchDbPayload {
  entityType: 'BRANCH';
}

export type BranchPersistenceModel = BranchDbModel;
