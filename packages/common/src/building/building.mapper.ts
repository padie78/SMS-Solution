import type { SmsEntityTag } from '../shared/sms-entity-tag.js';
import { BuildingEntity } from './building.entity.js';
import type { BuildingDTO } from './building.dto.js';

export interface BuildingPersistence {
  sms_et: SmsEntityTag;
  bld_id: string;
  br_id: string;
  b_nm: string;
  use_ty?: string;
  use_ty_en?: string;
  st?: string;
  yr_blt?: number;
  m2?: number;
  m3?: number;
  hvac_ty?: string;
  bms?: boolean;
}

export const BuildingMapper = Object.freeze({
  dtoToEntity(dto: BuildingDTO): BuildingEntity {
    return BuildingEntity.fromDTO(dto);
  },

  toPersistence(entity: BuildingEntity): BuildingPersistence {
    const usageEnum = entity.usageTypeEnum;
    const usageLegacy = entity.usageType;
    return {
      sms_et: 'BLD',
      bld_id: entity.id,
      br_id: entity.branchId,
      b_nm: entity.name,
      ...(usageLegacy ? { use_ty: usageLegacy } : {}),
      ...(usageEnum ? { use_ty_en: usageEnum } : {}),
      ...(entity.status ? { st: entity.status } : {}),
      ...(entity.yearBuilt !== undefined ? { yr_blt: entity.yearBuilt } : {}),
      ...(entity.m2Surface !== undefined ? { m2: entity.m2Surface } : {}),
      ...(entity.m3Volume !== undefined ? { m3: entity.m3Volume } : {}),
      ...(entity.hvacType ? { hvac_ty: entity.hvacType } : {}),
      ...(entity.hasBms !== undefined ? { bms: entity.hasBms } : {})
    };
  },

  persistenceToDTO(row: BuildingPersistence): BuildingDTO {
    return {
      id: row.bld_id,
      branchId: row.br_id,
      name: row.b_nm,
      usageType: row.use_ty,
      usageTypeEnum: row.use_ty_en as BuildingDTO['usageTypeEnum'],
      status: row.st as BuildingDTO['status'],
      yearBuilt: row.yr_blt,
      m2Surface: row.m2,
      m3Volume: row.m3,
      hvacType: row.hvac_ty as BuildingDTO['hvacType'],
      hasBms: row.bms
    };
  }
});
