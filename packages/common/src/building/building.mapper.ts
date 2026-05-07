import type { SmsEntityTag } from '../shared/sms-entity-tag.js';
import { BuildingEntity } from './building.entity.js';
import { BuildingDTO } from './building.dto.js';
import type {
  BuildingUsageType,
  HvacType,
  MainFuelType,
  OperationalStatus
} from '../shared/graphql-setup-enums.js';

export interface BuildingPersistence {
  sms_et: SmsEntityTag;
  org_id: string;
  reg_id: string;
  bld_id: string;
  br_id: string;
  b_nm: string;
  st: OperationalStatus;

  /** Enterprise */
  fp_m2?: number;
  floors?: number;
  reno_yr?: number;
  ins_qual?: 'POOR' | 'AVERAGE' | 'HIGH';
  ww_ratio?: number;
  roof_ty?: 'GREEN' | 'REFLECTIVE' | 'STANDARD';
  hv_age?: number;
  hv_eff?: number;
  maint_st?: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL';
  audit_dt?: string;
  lt_tech?: 'LED' | 'FLUORESCENT' | 'HID' | 'MIXED';
  lt_pd?: number;
  bms_prot?: string[];
  smart_m?: boolean;
  dg?: 'MANUAL' | 'MONTHLY' | 'DAILY' | 'TELEMETRY';
  sub_topo?: 'CENTRALIZED' | 'BY_FLOOR' | 'BY_LOAD' | 'NONE';
  bdg_cert?: string[];
  epc?: string;
  onsite_kw?: number;
  aq_sns?: boolean;
  wat_rcy?: boolean;
  ev_pts?: number;

  /** Legacy */
  use_ty?: string;
  use_ty_en: string;
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

const ZERO_COORD = { lat: 0, lng: 0 } as const;

export const BuildingMapper = Object.freeze({
  dtoToEntity(dto: BuildingDTO): BuildingEntity {
    return BuildingEntity.fromDTO(dto);
  },

  toPersistence(entity: BuildingEntity): BuildingPersistence {
    const c = entity.coordinates;
    return {
      sms_et: 'BLD',
      org_id: entity.organizationId,
      reg_id: entity.regionId,
      bld_id: entity.id,
      br_id: entity.branchId,
      b_nm: entity.name,
      st: entity.status,
      use_ty_en: entity.usageTypeEnum,
      m2: entity.m2Surface,
      m3: entity.m3Volume,
      yr_blt: entity.yearBuilt,
      hvac_ty: entity.hvacType,
      bms: entity.hasBms,
      ...(entity.usageType?.trim() ? { use_ty: entity.usageType.trim() } : {}),
      main_fuel: entity.mainFuelType,
      ...(entity.bmsVendor?.trim() ? { bms_vnd: entity.bmsVendor.trim() } : {}),
      crd_lat: c.lat,
      crd_lng: c.lng,
      ...(entity.footprintM2 !== undefined ? { fp_m2: entity.footprintM2 } : {}),
      floors: entity.floorsCount,
      ...(entity.renovationYear !== undefined ? { reno_yr: entity.renovationYear } : {}),
      ins_qual: entity.insulationQuality,
      ww_ratio: entity.windowWallRatio,
      roof_ty: entity.roofType,
      ...(entity.hvacAgeYears !== undefined ? { hv_age: entity.hvacAgeYears } : {}),
      ...(entity.hvacEfficiencyRating !== undefined ? { hv_eff: entity.hvacEfficiencyRating } : {}),
      maint_st: entity.maintenanceStatus,
      ...(entity.lastEnergyAuditDate ? { audit_dt: entity.lastEnergyAuditDate } : {}),
      lt_tech: entity.lightingTechnology,
      ...(entity.lightingPowerDensity !== undefined ? { lt_pd: entity.lightingPowerDensity } : {}),
      bms_prot: [...entity.bmsProtocols],
      smart_m: entity.hasSmartMetering,
      dg: entity.dataGranularity,
      sub_topo: entity.submeteringTopology,
      bdg_cert: [...entity.buildingCertifications],
      ...(entity.epcRating ? { epc: entity.epcRating } : {}),
      ...(entity.onsiteGenerationCapacityKw !== undefined ? { onsite_kw: entity.onsiteGenerationCapacityKw } : {}),
      aq_sns: entity.airQualitySensors,
      wat_rcy: entity.waterRecyclingSystem,
      ev_pts: entity.evChargingPoints,
      ...(entity.createdAt ? { crt_at: entity.createdAt } : {}),
      ...(entity.updatedAt ? { upd_at: entity.updatedAt } : {})
    };
  },

  persistenceToDTO(row: BuildingPersistence): BuildingDTO {
    const hasCoords = row.crd_lat !== undefined && row.crd_lng !== undefined;
    const coords = hasCoords ? { lat: row.crd_lat as number, lng: row.crd_lng as number } : ZERO_COORD;

    return new BuildingDTO(
      row.bld_id,
      row.org_id,
      row.reg_id,
      row.br_id,
      row.b_nm,
      row.st,
      row.use_ty_en as BuildingUsageType,
      row.m2,
      row.m3 ?? 0,
      row.fp_m2,
      row.floors,
      row.yr_blt ?? new Date().getFullYear(),
      row.reno_yr,
      row.ins_qual,
      row.ww_ratio,
      row.roof_ty,
      coords,
      row.hvac_ty as HvacType,
      row.hv_age,
      row.hv_eff,
      row.maint_st,
      row.audit_dt,
      row.main_fuel ?? 'ELECTRICITY',
      row.lt_tech,
      row.lt_pd,
      row.bms,
      row.bms_vnd,
      row.bms_prot,
      row.smart_m ?? false,
      row.dg,
      row.sub_topo,
      row.bdg_cert,
      row.epc,
      row.onsite_kw,
      row.aq_sns,
      row.wat_rcy,
      row.ev_pts,
      row.crt_at,
      row.upd_at,
      row.use_ty
    );
  }
});
