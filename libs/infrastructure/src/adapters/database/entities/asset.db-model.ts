import type { AssetEntity } from '@sms/domain';
import type { DomainAuditOmit, SingleTableInfrastructureFields } from './single-table-record.entity.js';
import type { DomainDataOnly } from '../types/domain-snapshot.js';

export type AssetDbPayload = Omit<DomainDataOnly<AssetEntity>, DomainAuditOmit>;

export interface AssetDbModel extends SingleTableInfrastructureFields, AssetDbPayload {
  entityType: 'ASSET';
}

export type AssetPersistenceModel = AssetDbModel;
