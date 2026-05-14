import type { ProductionLogEntity } from '@sms/domain';
import type { SingleTableInfrastructureFields } from './base-persistence.model.js';
import type { DomainDataOnly } from '../types/domain-snapshot.js';

export type ProductionLogDbPayload = DomainDataOnly<ProductionLogEntity>;

export interface ProductionLogDbModel extends SingleTableInfrastructureFields, ProductionLogDbPayload {
  entityType: 'PRODUCTION_LOG';
}

export type ProductionLogPersistenceModel = ProductionLogDbModel;
