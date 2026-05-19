import type { MeterEntity } from '@sms/domain';
import type { DomainAuditOmit, SingleTableInfrastructureFields } from './single-table-record.entity.js';
import type { DomainDataOnly } from '../types/domain-snapshot.js';

export type MeterDbPayload = Omit<DomainDataOnly<MeterEntity>, DomainAuditOmit>;

export interface MeterDbModel extends SingleTableInfrastructureFields, MeterDbPayload {
  entityType: 'METER';
}

export type MeterPersistenceModel = MeterDbModel;
