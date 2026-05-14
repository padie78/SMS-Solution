import type { UserEntity } from '@sms/domain';
import type { SingleTableInfrastructureFields } from './base-persistence.model.js';
import type { DomainDataOnly } from '../types/domain-snapshot.js';

export type UserDbPayload = DomainDataOnly<UserEntity>;

export interface UserDbModel extends SingleTableInfrastructureFields, UserDbPayload {
  entityType: 'USER';
}

export type UserPersistenceModel = UserDbModel;
