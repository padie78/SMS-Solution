import type { SmsEntityTag } from '@sms/common';
import { BranchEntity } from '@sms/domain';
import { BranchDTO, parseBranchDTO } from '@sms/common';

export interface BranchPersistence {
  sms_et: SmsEntityTag;
  org_id: string;
  br_id: string;
  reg_id: string;
  br_nm: string;
  /** Enterprise branch code */
  br_cd?: string;
  /** Enterprise: ACTIVE | INACTIVE | CONSTRUCTION */
  st: BranchDTO['status'];
  br_ty?: BranchDTO['branchType'];
  tz?: string;
  hq?: boolean;
  con_yr?: number;
  reno_yr?: number;
  op_hr?: BranchDTO['operatingHours'];
  tags?: string[];
  own_ty?: BranchDTO['ownershipType'];
  lease_exp?: string;
  def_tariff_id?: string;
  cc_id?: string;
  en_bud?: number;
  loc_curr?: string;
  rev_tgt?: number;
  fl_m2?: number;
  emp_ct?: number;
  fte?: number;
  days_yr?: number;
  avg_vis?: number;
  ei_tgt?: number;
  bs_kw?: number;
  peak_kw?: number;
  wx_id?: string;
  bk_ty?: BranchDTO['backupPowerType'];
  fuel_cap_l?: number;
  crit_kw?: number;
  hs_ren?: boolean;
  ren_kw?: number;
  hs_ev?: boolean;
  certs?: string[];
  aq?: boolean;
  cool_sp?: number;
  heat_sp?: number;
  br_mgr?: { name: string; email: string; phone?: string };

  /** Legacy */
  m2_sfc?: number;
  fac_ty?: string;
  en_tgt?: number;
  addr_ln1?: string;
  addr_ln2?: string;
  addr_city?: string;
  addr_reg?: string;
  addr_post?: string;
  addr_ctry?: string;
  crt_at?: string;
  upd_at?: string;
}

const DEFAULT_HOURS: BranchDTO['operatingHours'] = {
  weekdays: { open: '09:00', close: '18:00' }
};

function legacyFacilityToBranchType(fac: string | undefined): BranchDTO['branchType'] {
  if (fac === 'MANUFACTURING') return 'PRODUCTION';
  return 'OFFICE';
}

function legacyStatusToBranchStatus(
  st: BranchDTO['status'] | string | undefined,
  fallback: BranchDTO['status']
): BranchDTO['status'] {
  if (st === 'ACTIVE' || st === 'INACTIVE' || st === 'CONSTRUCTION') return st;
  return fallback;
}

export const BranchMapper = Object.freeze({
  dtoToEntity(dto: BranchDTO): BranchEntity {
    return BranchEntity.fromDTO(dto);
  },

  toPersistence(entity: BranchEntity): BranchPersistence {
    return {
      sms_et: 'BR',
      org_id: entity.organizationId,
      br_id: entity.id,
      reg_id: entity.regionId,
      br_nm: entity.name,
      br_cd: entity.branchCode,
      st: entity.status,
      br_ty: entity.branchType,
      ...(entity.timezone?.trim() ? { tz: entity.timezone.trim() } : {}),
      ...(entity.isHeadquarters ? { hq: true } : {}),
      con_yr: entity.constructionYear,
      ...(entity.renovationYear !== undefined ? { reno_yr: entity.renovationYear } : {}),
      op_hr: entity.operatingHours,
      tags: [...entity.tags],
      own_ty: entity.ownershipType,
      ...(entity.leaseExpirationDate ? { lease_exp: entity.leaseExpirationDate } : {}),
      ...(entity.defaultTariffId ? { def_tariff_id: entity.defaultTariffId } : {}),
      ...(entity.costCenterId ? { cc_id: entity.costCenterId } : {}),
      ...(entity.annualEnergyBudget !== undefined ? { en_bud: entity.annualEnergyBudget } : {}),
      loc_curr: entity.localCurrency,
      ...(entity.annualRevenueTarget !== undefined ? { rev_tgt: entity.annualRevenueTarget } : {}),
      fl_m2: entity.totalFloorAreaM2,
      m2_sfc: entity.totalFloorAreaM2,
      ...(entity.branchType === 'PRODUCTION' ? { fac_ty: 'MANUFACTURING' } : {}),
      emp_ct: entity.employeeCount,
      fte: entity.fteEmployees,
      days_yr: entity.openingDaysPerYear,
      ...(entity.averageDailyVisitors !== undefined ? { avg_vis: entity.averageDailyVisitors } : {}),
      ei_tgt: entity.energyIntensityTarget,
      bs_kw: entity.baseloadThreshold,
      peak_kw: entity.peakPowerContracted,
      ...(entity.weatherStationId ? { wx_id: entity.weatherStationId } : {}),
      bk_ty: entity.backupPowerType,
      ...(entity.fuelTankCapacityLiters !== undefined ? { fuel_cap_l: entity.fuelTankCapacityLiters } : {}),
      ...(entity.criticalLoadKw !== undefined ? { crit_kw: entity.criticalLoadKw } : {}),
      hs_ren: entity.hasOnSiteRenewable,
      ...(entity.renewableCapacityKw !== undefined ? { ren_kw: entity.renewableCapacityKw } : {}),
      hs_ev: entity.hasEvCharging,
      certs: [...entity.certifications],
      aq: entity.hasAirQualityMonitoring,
      cool_sp: entity.coolingSetPoint,
      heat_sp: entity.heatingSetPoint,
      // 1. En toPersistence (Alrededor de la línea 100):
      br_mgr: entity.branchManager
        ? {
          name: entity.branchManager.name ?? 'N/A',
          email: entity.branchManager.email ?? 'no-email@sms.com',
          ...(entity.branchManager.phone ? { phone: entity.branchManager.phone } : {})
        }
        : undefined,
      ...(entity.createdAt ? { crt_at: entity.createdAt } : {}),
      ...(entity.updatedAt ? { upd_at: entity.updatedAt } : {})
    };
  },

  persistenceToDTO(row: BranchPersistence): BranchDTO {
    const floorM2 = row.fl_m2 ?? row.m2_sfc ?? 0;
    const branchType = row.br_ty ?? legacyFacilityToBranchType(row.fac_ty);
    const status = legacyStatusToBranchStatus(row.st, 'ACTIVE');
    const opHr = row.op_hr ?? DEFAULT_HOURS;
    const localCurr = (row.loc_curr ?? 'USD').toUpperCase().slice(0, 3).padEnd(3, 'X');
    const branchCode = row.br_cd?.trim() || row.br_nm;

    return new BranchDTO(
      row.br_id,
      row.org_id,
      row.reg_id,
      row.br_nm,
      branchCode,
      status,
      branchType,
      Boolean(row.hq),
      row.con_yr ?? 2000,
      row.reno_yr,
      opHr,
      row.tags,
      row.own_ty ?? 'LEASED',
      row.lease_exp,
      row.def_tariff_id,
      row.cc_id,
      row.en_bud,
      localCurr.length === 3 ? localCurr : 'USD',
      row.rev_tgt,
      floorM2,
      row.emp_ct ?? 0,
      row.fte ?? 0,
      row.days_yr ?? 250,
      row.avg_vis,
      row.ei_tgt ?? row.en_tgt ?? 0,
      row.bs_kw ?? 0,
      row.peak_kw ?? 0,
      row.wx_id,
      row.bk_ty,
      row.fuel_cap_l,
      row.crit_kw,
      row.hs_ren ?? false,
      row.ren_kw,
      row.hs_ev ?? false,
      row.certs,
      row.aq,
      row.cool_sp ?? 24,
      row.heat_sp ?? 20,
      row.br_mgr ?? { name: 'N/A', email: 'N/A' },
      row.crt_at,
      row.upd_at,
      row.tz
    );
  }
});
