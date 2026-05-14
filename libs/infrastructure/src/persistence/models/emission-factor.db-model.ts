import type { EmissionFactorEntity } from '@sms/domain';
import type { DomainAuditOmit, SingleTableInfrastructureFields } from './base-persistence.model.js';
import type { DomainDataOnly } from '../types/domain-snapshot.js';

export type EmissionFactorDbPayload = Omit<DomainDataOnly<EmissionFactorEntity>, DomainAuditOmit>;

export interface EmissionFactorDbModel extends SingleTableInfrastructureFields, EmissionFactorDbPayload {
  entityType: 'EMISSION_FACTOR';
}

export type EmissionFactorPersistenceModel = EmissionFactorDbModel;
