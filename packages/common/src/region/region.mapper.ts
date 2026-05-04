import type { SmsEntityTag } from '../shared/sms-entity-tag.js';
import { RegionEntity } from './region.entity.js';
import type { RegionDTO } from './region.dto.js';

export interface RegionPersistence {
  sms_et: SmsEntityTag;
  reg_id: string;
  reg_nm: string;
  reg_cd?: string;
}

export const RegionMapper = Object.freeze({
  dtoToEntity(dto: RegionDTO): RegionEntity {
    return RegionEntity.fromDTO(dto);
  },

  toPersistence(entity: RegionEntity): RegionPersistence {
    return {
      sms_et: 'REG',
      reg_id: entity.id,
      reg_nm: entity.name,
      ...(entity.code ? { reg_cd: entity.code } : {})
    };
  },

  persistenceToDTO(row: RegionPersistence): RegionDTO {
    return {
      id: row.reg_id,
      name: row.reg_nm,
      code: row.reg_cd
    };
  }
});
