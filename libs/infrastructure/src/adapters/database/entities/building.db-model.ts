import type { BuildingEntity } from '@sms/domain';
import type { DomainAuditOmit, SingleTableInfrastructureFields } from './single-table-record.entity.js';
import type { DomainDataOnly } from '../types/domain-snapshot.js';

export type BuildingDbPayload = Omit<DomainDataOnly<BuildingEntity>, DomainAuditOmit>;

/** Edificio — SK prefijo `SITE#`. */
export interface BuildingDbModel extends SingleTableInfrastructureFields, BuildingDbPayload {
  entityType: 'SITE';
}

export type BuildingPersistenceModel = BuildingDbModel;
