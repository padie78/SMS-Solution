import { ASSET_TYPE_TO_PERSISTENCE } from '@sms/contracts';
import type { AssetType } from '@sms/contracts';
import { AssetTypeSchema } from '@sms/contracts';
import type { SmsEntityTag } from '@sms/contracts';
import { AssetEntity } from '@sms/domain';
import { AssetDTO } from '@sms/contracts';
import type { AssetLifecycleStatus } from '@sms/contracts';

export interface AssetPersistence {
  sms_et: SmsEntityTag;
  ast_id: string;
  org_id: string;
  reg_id: string;
  br_id: string;
  bld_id: string;
  cc_id: string;
  ast_ty: string;
  ast_nm: string;
  ast_st: AssetLifecycleStatus | 'OPERATIONAL' | 'DECOMMISSIONED' | 'MAINTENANCE';

  ast_tag?: string;
  bc?: string;
  crit?: 'LOW' | 'MEDIUM' | 'HIGH' | 'MISSION_CRITICAL';
  mfg?: string;
  mdl?: string;
  ser_n?: string;
  inst_dt?: string;
  life_yrs?: number;
  deco_dt?: string;
  is_seu?: boolean;
  nom_kw?: number;
  nom_pwr?: number;
  stby_kw?: number;
  en_src?: AssetDTO['energySource'];
  nom_eff?: number;
  duty?: number;
  pf_tgt?: number;
  ghg_scope?: AssetDTO['ghgScope'];
  em_cat?: AssetDTO['emissionSourceCategory'];
  fuel_ty?: string;
  bio_frac?: number;
  ref_gas?: string;
  ref_kg?: number;
  ref_gwp?: number;
  leak_rt?: number;
  met_id?: string;
  cloud_dev?: string;
  tel_tp?: string;
  virt?: boolean;
  dq?: number;
  last_maint?: string;
  next_maint?: string;
  maint_vnd?: string;
  cond_idx?: AssetDTO['conditionIndex'];
  eff_deg?: number;
  redun?: AssetDTO['redundancyLevel'];
  mtbf?: number;

  tags?: Record<string, string>;
  crt_at?: string;
  upd_at?: string;
}

function decodeAssetStatus(raw: string | undefined): AssetLifecycleStatus {
  if (!raw) return 'ACTIVE';
  const u = raw.toUpperCase();
  if (u === 'OPERATIONAL') return 'ACTIVE';
  if (u === 'DECOMMISSIONED') return 'INACTIVE';
  if (u === 'MAINTENANCE') return 'MAINTENANCE';
  if (u === 'ACTIVE' || u === 'INACTIVE' || u === 'MAINTENANCE') return u as AssetLifecycleStatus;
  return 'ACTIVE';
}

function safeDecodeAssetType(code: string | undefined): AssetType {
  if (!code?.trim()) return 'HVAC';
  const trimmed = code.trim();
  const byPersist = Object.entries(ASSET_TYPE_TO_PERSISTENCE).find(([, v]) => v === trimmed);
  if (byPersist) return byPersist[0] as AssetType;
  const keyParse = AssetTypeSchema.safeParse(trimmed);
  if (keyParse.success) return keyParse.data;
  return 'HVAC';
}

export const AssetMapper = Object.freeze({
  dtoToEntity(dto: AssetDTO): AssetEntity {
    return AssetEntity.fromDTO(dto);
  },

  toPersistence(entity: AssetEntity): AssetPersistence {
    const tags = entity.tags && Object.keys(entity.tags).length > 0 ? { ...entity.tags } : undefined;
    return {
      sms_et: 'AST',
      ast_id: entity.id,
      org_id: entity.organizationId,
      reg_id: entity.regionId,
      br_id: entity.branchId,
      bld_id: entity.buildingId,
      cc_id: entity.costCenterId,
      ast_ty: ASSET_TYPE_TO_PERSISTENCE[entity.type],
      ast_nm: entity.name,
      ast_st: entity.status,
      ...(entity.assetTag?.trim() ? { ast_tag: entity.assetTag.trim() } : {}),
      ...(entity.barcode?.trim() ? { bc: entity.barcode.trim() } : {}),
      crit: entity.criticality,
      ...(entity.manufacturer?.trim() ? { mfg: entity.manufacturer.trim() } : {}),
      ...(entity.model?.trim() ? { mdl: entity.model.trim() } : {}),
      ...(entity.serialNumber?.trim() ? { ser_n: entity.serialNumber.trim() } : {}),
      inst_dt: entity.installationDate,
      life_yrs: entity.usefulLifeYears,
      ...(entity.decommissionDate?.trim() ? { deco_dt: entity.decommissionDate.trim() } : {}),
      is_seu: entity.isSignificantEnergyUse,
      nom_kw: entity.nominalPowerKw,
      nom_pwr: entity.nominalPowerKw,
      ...(entity.standbyPowerKw !== undefined ? { stby_kw: entity.standbyPowerKw } : {}),
      en_src: entity.energySource,
      nom_eff: entity.nominalEfficiency,
      duty: entity.dutyCycleExpected,
      pf_tgt: entity.powerFactorTarget,
      ghg_scope: entity.ghgScope,
      em_cat: entity.emissionSourceCategory,
      ...(entity.fuelType?.trim() ? { fuel_ty: entity.fuelType.trim() } : {}),
      bio_frac: entity.biogenicFraction,
      ...(entity.refrigerantGasType?.trim() ? { ref_gas: entity.refrigerantGasType.trim() } : {}),
      ...(entity.refrigerantChargeKg !== undefined ? { ref_kg: entity.refrigerantChargeKg } : {}),
      ...(entity.refrigerantGWP !== undefined ? { ref_gwp: entity.refrigerantGWP } : {}),
      leak_rt: entity.annualLeakageRateExpected,
      ...(entity.meterId?.trim() ? { met_id: entity.meterId.trim() } : {}),
      ...(entity.cloudDeviceId?.trim() ? { cloud_dev: entity.cloudDeviceId.trim() } : {}),
      ...(entity.telemetryTopic?.trim() ? { tel_tp: entity.telemetryTopic.trim() } : {}),
      virt: entity.isVirtualAsset,
      dq: entity.dataQualityScore,
      ...(entity.lastMaintenanceDate?.trim() ? { last_maint: entity.lastMaintenanceDate.trim() } : {}),
      ...(entity.nextMaintenanceDate?.trim() ? { next_maint: entity.nextMaintenanceDate.trim() } : {}),
      ...(entity.maintenanceVendor?.trim() ? { maint_vnd: entity.maintenanceVendor.trim() } : {}),
      cond_idx: entity.conditionIndex,
      eff_deg: entity.efficiencyDegradationFactor,
      redun: entity.redundancyLevel,
      ...(entity.mtbfHours !== undefined ? { mtbf: entity.mtbfHours } : {}),
      ...(tags !== undefined ? { tags } : {}),
      ...(entity.createdAt ? { crt_at: entity.createdAt } : {}),
      ...(entity.updatedAt ? { upd_at: entity.updatedAt } : {})
    };
  },

  persistenceToDTO(row: AssetPersistence): AssetDTO {
    const nomKw = row.nom_kw ?? row.nom_pwr ?? 0;
    const ccRaw = row.cc_id?.trim();
    const costCenterId = ccRaw !== undefined && ccRaw !== '' ? ccRaw : 'cc-unassigned';

    return new AssetDTO(
      row.ast_id,
      row.org_id,
      row.reg_id,
      row.br_id,
      row.bld_id,
      costCenterId,
      row.ast_nm?.trim() ? row.ast_nm : 'Unnamed asset',
      row.ast_tag,
      row.bc,
      safeDecodeAssetType(row.ast_ty),
      decodeAssetStatus(row.ast_st),
      row.crit ?? 'MEDIUM',
      row.mfg,
      row.mdl,
      row.ser_n,
      row.inst_dt ?? '1970-01-01',
      row.life_yrs ?? 10,
      row.deco_dt,
      row.is_seu ?? false,
      nomKw,
      row.stby_kw,
      row.en_src ?? 'ELECTRICITY',
      row.nom_eff ?? 1,
      row.duty ?? 0.8,
      row.pf_tgt ?? 0.95,
      row.ghg_scope ?? 'SCOPE_2',
      row.em_cat ?? 'PROCESS_EMISSIONS',
      row.fuel_ty,
      row.bio_frac,
      row.ref_gas,
      row.ref_kg,
      row.ref_gwp,
      row.leak_rt ?? 0.05,
      row.met_id,
      row.cloud_dev,
      row.tel_tp,
      row.virt ?? false,
      row.dq ?? 1,
      row.last_maint,
      row.next_maint,
      row.maint_vnd,
      row.cond_idx ?? 'GOOD',
      row.eff_deg ?? 0.02,
      row.redun ?? 'N',
      row.mtbf,
      row.tags ?? {},
      row.crt_at,
      row.upd_at
    );
  }
});
