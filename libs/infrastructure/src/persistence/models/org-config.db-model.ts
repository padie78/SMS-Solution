import type { OrgConfigEntity } from '@sms/domain';
import type { DomainAuditOmit, SingleTableInfrastructureFields } from './base-persistence.model.js';
import type { DomainDataOnly } from '../types/domain-snapshot.js';

export type OrgConfigDbPayload = Omit<DomainDataOnly<OrgConfigEntity>, DomainAuditOmit>;

export interface OrgConfigDbModel extends SingleTableInfrastructureFields, OrgConfigDbPayload {
  entityType: 'ORG_CONFIG';
}

export type OrgConfigPersistenceModel = OrgConfigDbModel;
