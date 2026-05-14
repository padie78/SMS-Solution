import type { SmsEntityTag } from '@sms/contracts';
import { ROLE_TO_CODE, decodeRole } from '@sms/contracts';
import { UserEntity } from '@sms/domain';
import type { UserDTO } from '@sms/contracts';

export interface UserPersistence {
  sms_et: SmsEntityTag;
  usr_id: string;
  em: string;
  usr_role: string;
  scope_reg_id?: string;
  scope_br_id?: string;
  dn?: string;
  fn?: string;
  lang?: string;
}

export const UserMapper = Object.freeze({
  dtoToEntity(dto: UserDTO): UserEntity {
    return UserEntity.fromDTO(dto);
  },

  toPersistence(entity: UserEntity): UserPersistence {
    return {
      sms_et: 'USR',
      usr_id: entity.id,
      em: entity.email,
      usr_role: ROLE_TO_CODE[entity.role],
      ...(entity.scopeRegionId?.trim() ? { scope_reg_id: entity.scopeRegionId } : {}),
      ...(entity.scopeBranchId?.trim() ? { scope_br_id: entity.scopeBranchId } : {}),
      ...(entity.displayName?.trim() ? { dn: entity.displayName } : {}),
      ...(entity.fullName?.trim() ? { fn: entity.fullName } : {}),
      ...(entity.language ? { lang: entity.language } : {})
    };
  },

  persistenceToDTO(row: UserPersistence): UserDTO {
    return {
      id: row.usr_id,
      email: row.em,
      displayName: row.dn,
      fullName: row.fn,
      role: decodeRole(row.usr_role),
      scopeRegionId: row.scope_reg_id,
      scopeBranchId: row.scope_br_id,
      language: row.lang as UserDTO['language']
    };
  }
});
