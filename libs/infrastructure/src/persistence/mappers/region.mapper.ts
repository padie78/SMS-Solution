import type { SmsEntityTag } from '@sms/common';
import { RegionEntity } from '@sms/domain';
import { RegionDTO } from '@sms/common';
import type { LifecycleStatus } from '@sms/common';

export interface RegionPersistence {
  sms_et: SmsEntityTag;
  org_id: string;
  reg_id: string;
  reg_nm: string;
  reg_cd: string;
  ctry_cd: string;
  tz: string;
  st: LifecycleStatus;
  // Enterprise
  cz?: RegionDTO['climateZone'];
  hdd?: number;
  cdd?: number;
  tot_m2?: number;
  hc?: number;
  rev_tgt?: number;
  gef?: number;
  ctx?: number;
  cmk?: RegionDTO['carbonMarketType'];
  mac?: number;
  ren_av?: number;
  grid_ren?: number;
  wsi?: number;
  loc_regs?: string[];
  mat?: RegionDTO['maturityLevel'];
  eco?: RegionDTO['economicArea'];
  reg_mgr?: { name: string; email: string; phone?: string };
  rr_tgt?: number;
  es_risk?: number;

  // Legacy/back-compat
  dsc?: string;
  crd_lat?: number;
  crd_lng?: number;
  crt_at?: string;
  upd_at?: string;
}

export const RegionMapper = Object.freeze({
  dtoToEntity(dto: RegionDTO): RegionEntity {
    return RegionEntity.fromDTO(dto);
  },

  toPersistence(entity: RegionEntity): RegionPersistence {
    const coords = entity.coordinates;
    return {
      sms_et: 'REG',
      org_id: entity.organizationId,
      reg_id: entity.id,
      reg_nm: entity.name,
      reg_cd: entity.code,
      ctry_cd: entity.countryCode,
      tz: entity.timezone,
      st: entity.status,
      cz: entity.climateZone,
      hdd: entity.avgHDD,
      cdd: entity.avgCDD,
      tot_m2: entity.totalRegionalM2,
      hc: entity.totalHeadcount,
      ...(entity.annualRevenueTarget !== undefined ? { rev_tgt: entity.annualRevenueTarget } : {}),
      gef: entity.gridEmissionFactor,
      ctx: entity.carbonTaxRate,
      cmk: entity.carbonMarketType,
      mac: entity.marginalAbatementCost,
      ren_av: entity.renewableEnergyAvailability,
      grid_ren: entity.gridRenewableShare,
      wsi: entity.waterStressIndex,
      loc_regs: [...(entity.localRegulations ?? [])],
      mat: entity.maturityLevel,
      eco: entity.economicArea,
      reg_mgr: entity.regionalManager,
      rr_tgt: entity.regionalReductionTarget,
      es_risk: entity.energyScarcityRisk,
      ...(entity.description?.trim() ? { dsc: entity.description } : {}),
      crd_lat: coords.lat,
      crd_lng: coords.lng,
      ...(entity.createdAt ? { crt_at: entity.createdAt } : {}),
      ...(entity.updatedAt ? { upd_at: entity.updatedAt } : {})
    };
  },

  persistenceToDTO(row: RegionPersistence): RegionDTO {
    const coords =
      row.crd_lat !== undefined && row.crd_lng !== undefined ? { lat: row.crd_lat, lng: row.crd_lng } : { lat: 0, lng: 0 };

    return new RegionDTO(
      row.reg_id,
      row.org_id,
      row.reg_nm,
      row.reg_cd,
      row.ctry_cd,
      row.tz,
      coords,
      row.cz ?? 'TEMPERATE',
      row.hdd,
      row.cdd,
      row.tot_m2,
      row.hc,
      row.rev_tgt,
      row.gef,
      row.ctx,
      row.cmk,
      row.mac,
      row.ren_av,
      row.grid_ren,
      row.wsi,
      row.loc_regs,
      row.mat ?? 'MANUAL',
      row.eco ?? 'EMEA',
      row.reg_mgr ?? { name: 'N/A', email: 'N/A' },
      row.rr_tgt,
      row.es_risk,
      row.st ?? 'ACTIVE',
      row.crt_at,
      row.upd_at,
      row.dsc
    );
  }
});
