import type { SmsEntityTag } from '@sms/contracts';
import {
  CostAllocationMethodSchema,
  LifecycleStatusSchema,
  type CostAllocationMethod,
  type LifecycleStatus
} from '@sms/contracts';
import {
  CostCenterDTO,
  CostCenterTypeSchema,
  CostCenterForecastModelSchema
} from '@sms/contracts';
import { CostCenterEntity } from '@sms/domain';

export interface CostCenterPersistence {
  sms_et: SmsEntityTag;
  org_id: string;
  cc_id: string;
  cc_nm: string;
  ext_id?: string;
  par_id?: string;
  br_id?: string;
  bld_id?: string;
  ann_budg?: number;
  curr?: string;
  bud_thr?: number;
  carb_t?: number;
  carb_px?: number;
  bud_sens?: number;
  fy?: number;
  hc?: number;
  fl_m2?: number;
  prod_u?: string;
  tgt_int?: number;
  ren_tgt?: number;
  alloc_m?: string;
  pct?: number;
  is_sh?: boolean;
  alloc_rev?: string;
  appr_by?: string;
  cc_ty?: string;
  fc_mdl?: string;
  mgr_em?: string;
  op_hr_id?: string;
  st?: string;
  tags?: Record<string, string>;
  crt_at?: string;
  upd_at?: string;
}

function safeParseType(raw: string | undefined): CostCenterDTO['type'] {
  if (!raw?.trim()) return 'DEPARTMENT';
  const p = CostCenterTypeSchema.safeParse(raw.trim());
  return p.success ? p.data : 'DEPARTMENT';
}

function safeParseForecast(raw: string | undefined): CostCenterDTO['forecastModel'] {
  if (!raw?.trim()) return 'STRICT_BUDGET';
  const p = CostCenterForecastModelSchema.safeParse(raw.trim());
  return p.success ? p.data : 'STRICT_BUDGET';
}

function safeParseAllocation(raw: string | undefined): CostAllocationMethod {
  if (!raw?.trim()) return 'PERCENTAGE';
  const p = CostAllocationMethodSchema.safeParse(raw.trim());
  return p.success ? p.data : 'PERCENTAGE';
}

function safeParseLifecycle(raw: string | undefined): LifecycleStatus {
  if (!raw?.trim()) return 'ACTIVE';
  const p = LifecycleStatusSchema.safeParse(raw.trim());
  return p.success ? p.data : 'ACTIVE';
}

export const CostCenterMapper = Object.freeze({
  dtoToEntity(dto: CostCenterDTO): CostCenterEntity {
    return CostCenterEntity.fromDTO(dto);
  },

  toPersistence(entity: CostCenterEntity): CostCenterPersistence {
    const tg = entity.tags && Object.keys(entity.tags).length > 0 ? { ...entity.tags } : undefined;
    return {
      sms_et: 'CC',
      org_id: entity.organizationId,
      cc_id: entity.id,
      cc_nm: entity.name,
      ann_budg: entity.annualBudget,
      curr: entity.currency,
      fy: entity.fiscalYear,
      alloc_m: entity.allocationMethod,
      pct: entity.percentage,
      st: entity.status,
      bud_thr: entity.budgetThresholdAlert,
      bud_sens: entity.budgetSensitivityIndex,
      ren_tgt: entity.renewableEnergyTarget,
      cc_ty: entity.type,
      fc_mdl: entity.forecastModel,
      is_sh: entity.isShared,
      ...(entity.externalId?.trim() ? { ext_id: entity.externalId.trim() } : {}),
      ...(entity.parentId?.trim() ? { par_id: entity.parentId.trim() } : {}),
      ...(entity.branchId?.trim() ? { br_id: entity.branchId.trim() } : {}),
      ...(entity.buildingId?.trim() ? { bld_id: entity.buildingId.trim() } : {}),
      ...(entity.carbonBudgetTons !== undefined ? { carb_t: entity.carbonBudgetTons } : {}),
      ...(entity.carbonShadowPrice !== undefined ? { carb_px: entity.carbonShadowPrice } : {}),
      ...(entity.headcount !== undefined ? { hc: entity.headcount } : {}),
      ...(entity.floorAreaSqm !== undefined ? { fl_m2: entity.floorAreaSqm } : {}),
      ...(entity.productionUnitName?.trim() ? { prod_u: entity.productionUnitName.trim() } : {}),
      ...(entity.targetIntensity !== undefined ? { tgt_int: entity.targetIntensity } : {}),
      ...(entity.allocationLastReviewDate?.trim() ? { alloc_rev: entity.allocationLastReviewDate.trim() } : {}),
      ...(entity.approvedBy?.trim() ? { appr_by: entity.approvedBy.trim() } : {}),
      ...(entity.managerEmail?.trim() ? { mgr_em: entity.managerEmail.trim() } : {}),
      ...(entity.operatingHoursId?.trim() ? { op_hr_id: entity.operatingHoursId.trim() } : {}),
      ...(tg !== undefined ? { tags: tg } : {}),
      ...(entity.createdAt ? { crt_at: entity.createdAt } : {}),
      ...(entity.updatedAt ? { upd_at: entity.updatedAt } : {})
    };
  },

  persistenceToDTO(row: CostCenterPersistence): CostCenterDTO {
    return new CostCenterDTO(
      row.cc_id,
      row.org_id,
      row.cc_nm,
      row.ext_id,
      row.par_id,
      row.br_id,
      row.bld_id,
      row.ann_budg ?? 0,
      row.curr,
      row.bud_thr,
      row.carb_t,
      row.carb_px,
      row.bud_sens,
      row.fy,
      row.hc,
      row.fl_m2,
      row.prod_u,
      row.tgt_int,
      row.ren_tgt,
      safeParseAllocation(row.alloc_m),
      row.pct,
      row.is_sh,
      row.alloc_rev,
      row.appr_by,
      safeParseType(row.cc_ty),
      safeParseForecast(row.fc_mdl),
      row.mgr_em,
      row.op_hr_id,
      safeParseLifecycle(row.st),
      row.tags ?? {},
      row.crt_at,
      row.upd_at
    );
  }
});
