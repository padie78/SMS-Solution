import type { RegionEntity } from '@sms/domain';
import type { DomainAuditOmit, SingleTableInfrastructureFields } from './base-persistence.model.js';
import type { DomainDataOnly } from '../types/domain-snapshot.js';

export type RegionDbPayload = Omit<DomainDataOnly<RegionEntity>, DomainAuditOmit>;

/** Ítem Single-Table para `REGION` (camelCase en TS; el mapper emite snake_case en DynamoDB). */
export interface RegionDbModel extends SingleTableInfrastructureFields, RegionDbPayload {
  entityType: 'REGION';
}

/** @deprecated Preferir `RegionDbModel`. */
export type RegionPersistenceModel = RegionDbModel;
