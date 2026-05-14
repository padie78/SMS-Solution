import type { SmsEntityTag } from '@sms/common';
import { z } from 'zod';
import {
  EnergyServiceTypeSchema,
  TariffLifecycleStatusSchema,
  TariffPricingModelSchema
} from '@sms/common';
import {
  TariffDTO,
  TariffDemandChargeUnitSchema,
  TariffSeasonSchema,
  TariffTierRatePairSchema
} from '@sms/common';
import { TariffEntity } from '@sms/domain';

function generateTariffFallbackId(row: Pick<TariffPersistence, 'vf' | 'ctr_id' | 'br_id'>): string {
  return `trf_${row.br_id}_${row.ctr_id}_${row.vf}`;
}

const TierRatesPersistSchema = z.array(TariffTierRatePairSchema);

function safeParseTieredRates(raw: string | undefined): TariffDTO['tieredRates'] {
  if (!raw?.trim()) return undefined;
  try {
    const j = JSON.parse(raw) as unknown;
    const p = TierRatesPersistSchema.safeParse(j);
    return p.success && p.data.length > 0 ? p.data : undefined;
  } catch {
    return undefined;
  }
}

function stringifyTieredRates(tiered: TariffDTO['tieredRates']): string | undefined {
  if (!tiered?.length) return undefined;
  return JSON.stringify(tiered);
}

function safeParsePricingModel(raw: string | undefined): TariffDTO['pricingModel'] {
  if (!raw?.trim()) return 'FIXED';
  const p = TariffPricingModelSchema.safeParse(raw.trim());
  return p.success ? p.data : 'FIXED';
}

function safeParseServiceType(raw: string | undefined): TariffDTO['serviceType'] {
  if (!raw?.trim()) return 'ELECTRICITY';
  const p = EnergyServiceTypeSchema.safeParse(raw.trim());
  return p.success ? p.data : 'ELECTRICITY';
}

function safeParseStatus(raw: string | undefined): TariffDTO['status'] {
  if (!raw?.trim()) return 'ACTIVE';
  const p = TariffLifecycleStatusSchema.safeParse(raw.trim());
  return p.success ? p.data : 'ACTIVE';
}

function safeParseDemandUnit(raw: string | undefined): TariffDTO['demandChargeUnit'] {
  if (!raw?.trim()) return 'KW';
  const p = TariffDemandChargeUnitSchema.safeParse(raw.trim().toUpperCase());
  return p.success ? p.data : 'KW';
}

function safeParseSeason(raw: string | undefined): TariffDTO['season'] {
  if (!raw?.trim()) return 'ALL_YEAR';
  const p = TariffSeasonSchema.safeParse(raw.trim().toUpperCase());
  return p.success ? p.data : 'ALL_YEAR';
}

export interface TariffPersistence {
  sms_et: Extract<SmsEntityTag, 'TRF'>;
  trf_id?: string;
  org_id: string;
  br_id: string;
  bld_id?: string;
  svc_ty?: string;
  prov_nm: string;
  ctr_id: string;
  price_md?: string;
  base_rt?: number;
  curr?: string;
  exp_avg_rt?: number;
  dm_chg_rt?: number;
  dm_chg_un?: string;
  fx_m_fee?: number;
  tax_pct?: number;
  tou_sid?: string;
  pk_rt?: number;
  vl_rt?: number;
  sh_rt?: number;
  seasn?: string;
  ti_js?: string;
  fuel_adj?: number;
  ix_ref?: string;
  ix_fmla?: string;
  vol_ix?: number;
  react_e?: number;
  pf_thr?: number;
  grn_prm?: number;
  c_tax_rt?: number;
  ef_rebate_rt?: number;
  vf: string;
  vt: string;
  bill_cy_dy?: number;
  st?: string;
  tags?: Record<string, string>;
  crt_at?: string;
  upd_at?: string;
}

export const TariffMapper = Object.freeze({
  dtoToEntity(dto: TariffDTO): TariffEntity {
    return TariffEntity.fromDTO(dto);
  },

  toPersistence(entity: TariffEntity): TariffPersistence {
    const tg =
      entity.tags && Object.keys(entity.tags).length > 0 ? { ...entity.tags } : undefined;
    const tiersJson = stringifyTieredRates(entity.tieredRates);
    return {
      sms_et: 'TRF',
      trf_id: entity.id,
      org_id: entity.orgId,
      br_id: entity.branchId,
      prov_nm: entity.providerName,
      ctr_id: entity.contractId,
      price_md: entity.pricingModel,
      base_rt: entity.baseRate,
      curr: entity.currency,
      vf: entity.validFrom,
      vt: entity.validTo,
      st: entity.status,
      svc_ty: entity.serviceType,
      ...(entity.buildingId?.trim() ? { bld_id: entity.buildingId.trim() } : {}),
      ...(entity.expectedAverageRate !== undefined ? { exp_avg_rt: entity.expectedAverageRate } : {}),
      ...(entity.demandChargeRate !== undefined ? { dm_chg_rt: entity.demandChargeRate } : {}),
      dm_chg_un: entity.demandChargeUnit,
      ...(entity.fixedMonthlyFee !== undefined ? { fx_m_fee: entity.fixedMonthlyFee } : {}),
      tax_pct: entity.taxPercentage,
      ...(entity.touScheduleId?.trim() ? { tou_sid: entity.touScheduleId.trim() } : {}),
      ...(entity.peakRate !== undefined ? { pk_rt: entity.peakRate } : {}),
      ...(entity.valleyRate !== undefined ? { vl_rt: entity.valleyRate } : {}),
      ...(entity.shoulderRate !== undefined ? { sh_rt: entity.shoulderRate } : {}),
      seasn: entity.season,
      ...(tiersJson !== undefined ? { ti_js: tiersJson } : {}),
      fuel_adj: entity.fuelAdjustmentFactor,
      ...(entity.indexReferenceId?.trim() ? { ix_ref: entity.indexReferenceId.trim() } : {}),
      ...(entity.indexAdjustmentFormula?.trim() ? { ix_fmla: entity.indexAdjustmentFormula.trim() } : {}),
      vol_ix: entity.volatilityIndex,
      ...(entity.reactiveEnergyCharge !== undefined ? { react_e: entity.reactiveEnergyCharge } : {}),
      pf_thr: entity.powerFactorThreshold,
      grn_prm: entity.greenPremium,
      ...(entity.carbonTaxRate !== undefined ? { c_tax_rt: entity.carbonTaxRate } : {}),
      ...(entity.efficiencyRebateRate !== undefined ? { ef_rebate_rt: entity.efficiencyRebateRate } : {}),
      bill_cy_dy: entity.billingCycleDay,
      ...(tg !== undefined ? { tags: tg } : {}),
      ...(entity.createdAt ? { crt_at: entity.createdAt } : {}),
      ...(entity.updatedAt ? { upd_at: entity.updatedAt } : {})
    };
  },

  persistenceToDTO(row: TariffPersistence): TariffDTO {
    const id = row.trf_id?.trim() || generateTariffFallbackId(row);
    return new TariffDTO(
      id,
      row.org_id,
      row.br_id,
      row.bld_id,
      safeParseServiceType(row.svc_ty),
      row.prov_nm,
      row.ctr_id,
      safeParsePricingModel(row.price_md),
      row.curr,
      row.base_rt ?? 0,
      row.exp_avg_rt,
      row.dm_chg_rt,
      safeParseDemandUnit(row.dm_chg_un),
      row.fx_m_fee,
      row.tax_pct,
      row.tou_sid,
      row.pk_rt,
      row.vl_rt,
      row.sh_rt,
      safeParseSeason(row.seasn),
      safeParseTieredRates(row.ti_js),
      row.fuel_adj,
      row.ix_ref,
      row.ix_fmla,
      row.vol_ix,
      row.react_e,
      row.pf_thr,
      row.grn_prm,
      row.c_tax_rt,
      row.ef_rebate_rt,
      row.vf,
      row.vt,
      row.bill_cy_dy,
      safeParseStatus(row.st),
      row.tags ?? {},
      row.crt_at,
      row.upd_at
    );
  }
});
