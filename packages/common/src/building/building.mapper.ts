import type { SmsEntityTag } from '../shared/sms-entity-tag.js';
import { BuildingEntity } from './building.entity.js';
import type { BuildingDTO } from './building.dto.js';
import type { MainFuelType, OperationalStatus } from '../shared/graphql-setup-enums.js';

export interface BuildingPersistence {
  sms_et: SmsEntityTag;
  org_id: string;
  reg_id: string;
  bld_id: string;
  br_id: string;
  b_nm: string;
  use_ty?: string;
  use_ty_en: string;
  st: OperationalStatus;
  yr_blt?: number;
  m2: number;
  m3?: number;
  hvac_ty: string;
  bms: boolean;
  bms_vnd?: string;
  main_fuel?: MainFuelType;
  crd_lat?: number;
  crd_lng?: number;
  crt_at?: string;
  upd_at?: string;
}

export const BuildingMapper = Object.freeze({
  dtoToEntity(dto: BuildingDTO): BuildingEntity {
    return BuildingEntity.fromDTO(dto);
  },

  toPersistence(entity: BuildingEntity): BuildingPersistence {
    const coords = entity.coordinates;
    return {
      sms_et: 'BLD',
      org_id: entity.organizationId,
      reg_id: entity.regionId,
      bld_id: entity.id,
      br_id: entity.branchId,
      b_nm: entity.name,
      use_ty_en: entity.usageTypeEnum,
      m2: entity.m2Surface,
      hvac_ty: entity.hvacType,
      bms: entity.hasBms,
      st: entity.status,
      ...(entity.usageType ? { use_ty: entity.usageType } : {}),
      ...(entity.yearBuilt !== undefined ? { yr_blt: entity.yearBuilt } : {}),
      ...(entity.m3Volume !== undefined ? { m3: entity.m3Volume } : {}),
      ...(entity.bmsVendor ? { bms_vnd: entity.bmsVendor } : {}),
      ...(entity.mainFuelType ? { main_fuel: entity.mainFuelType } : {}),
      ...(coords !== undefined ? { crd_lat: coords.lat, crd_lng: coords.lng } : {}),
      ...(entity.createdAt ? { crt_at: entity.createdAt } : {}),
      ...(entity.updatedAt ? { upd_at: entity.updatedAt } : {})
    };
  },

  persistenceToDTO(row: BuildingPersistence): BuildingDTO {
    const hasCoords = row.crd_lat !== undefined && row.crd_lng !== undefined;
    return {
      id: row.bld_id,
      organizationId: row.org_id,
      regionId: row.reg_id,
      branchId: row.br_id,
      name: row.b_nm,
      usageTypeEnum: row.use_ty_en as BuildingDTO['usageTypeEnum'],
      status: row.st,
      m2Surface: row.m2,
      hvacType: row.hvac_ty as BuildingDTO['hvacType'],
      hasBms: row.bms,
      ...(row.use_ty ? { usageType: row.use_ty } : {}),
      ...(row.yr_blt !== undefined ? { yearBuilt: row.yr_blt } : {}),
      ...(row.m3 !== undefined ? { m3Volume: row.m3 } : {}),
      ...(row.bms_vnd ? { bmsVendor: row.bms_vnd } : {}),
      ...(row.main_fuel ? { mainFuelType: row.main_fuel } : {}),
      ...(hasCoords ? { coordinates: { lat: row.crd_lat as number, lng: row.crd_lng as number } } : {}),
      ...(row.crt_at ? { createdAt: row.crt_at } : {}),
      ...(row.upd_at ? { updatedAt: row.upd_at } : {})
    };
  }
});
