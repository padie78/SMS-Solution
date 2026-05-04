import type { SmsEntityTag } from '../shared/sms-entity-tag.js';
import { BranchEntity } from './branch.entity.js';
import type { BranchDTO } from './branch.dto.js';

export interface BranchPersistence {
  sms_et: SmsEntityTag;
  br_id: string;
  reg_id: string;
  br_nm: string;
  tz?: string;
  m2_sfc?: number;
  fac_ty?: string;
  reg_lbl?: string;
}

export const BranchMapper = Object.freeze({
  dtoToEntity(dto: BranchDTO): BranchEntity {
    return BranchEntity.fromDTO(dto);
  },

  toPersistence(entity: BranchEntity): BranchPersistence {
    return {
      sms_et: 'BR',
      br_id: entity.id,
      reg_id: entity.regionId,
      br_nm: entity.name,
      ...(entity.timezone ? { tz: entity.timezone } : {}),
      ...(entity.m2Surface !== undefined ? { m2_sfc: entity.m2Surface } : {}),
      ...(entity.facilityType ? { fac_ty: entity.facilityType } : {}),
      ...(entity.regionLabel?.trim() ? { reg_lbl: entity.regionLabel } : {})
    };
  },

  persistenceToDTO(row: BranchPersistence): BranchDTO {
    return {
      id: row.br_id,
      regionId: row.reg_id,
      name: row.br_nm,
      timezone: row.tz,
      m2Surface: row.m2_sfc,
      facilityType: row.fac_ty as BranchDTO['facilityType'],
      regionLabel: row.reg_lbl
    };
  }
});
