import type { TariffEntity } from '@sms/domain';
import type { DomainAuditOmit, SingleTableInfrastructureFields } from './base-persistence.model.js';
import type { DomainDataOnly } from '../types/domain-snapshot.js';

export type TariffDbPayload = Omit<DomainDataOnly<TariffEntity>, DomainAuditOmit>;

export interface TariffDbModel extends SingleTableInfrastructureFields, TariffDbPayload {
  entityType: 'TARIFF';
}

export type TariffPersistenceModel = TariffDbModel;
