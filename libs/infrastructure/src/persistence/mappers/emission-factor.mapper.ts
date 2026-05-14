import type { SmsEntityTag } from '@sms/contracts';
import {
  EmissionFactorCatalogStatusSchema,
  EmissionFactorDTO,
  EmissionFactorGwpReferenceSchema,
  parseEmissionFactorDTO
} from '@sms/contracts';
import { EmissionFactorEntity } from '@sms/domain';

function normalizeDataQualityTier(
  raw: number | undefined
): EmissionFactorDTO['dataQualityTier'] {
  if (raw === 1 || raw === 2 || raw === 3 || raw === 4 || raw === 5) return raw;
  return 3;
}

function fallbackEmissionFactorId(
  row: Pick<EmissionFactorPersistence, 'yr' | 'reg_cd' | 'act_ty' | 'nm'>
): string {
  const act = row.act_ty?.trim() ? row.act_ty.trim() : 'ELEC';
  const slug = `${row.yr}_${row.reg_cd}_${act}_${row.nm}`
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 118);
  return `emf_${slug}`;
}

function safeParseCatalogStatus(raw: string | undefined): EmissionFactorDTO['status'] {
  if (!raw?.trim()) return 'ACTIVE';
  const p = EmissionFactorCatalogStatusSchema.safeParse(raw.trim().toUpperCase());
  return p.success ? p.data : 'ACTIVE';
}

function safeParseGwp(raw: string | undefined): EmissionFactorDTO['gwpReference'] {
  if (!raw?.trim()) return 'AR6';
  const p = EmissionFactorGwpReferenceSchema.safeParse(raw.trim().toUpperCase());
  return p.success ? p.data : 'AR6';
}

/** Single-table EMF snapshot; compat filas legacy (`scope`, `act_ty=ELEC`, `unit=kg/kWh`). */
export interface EmissionFactorPersistence {
  sms_et: Extract<SmsEntityTag, 'EMF'>;
  emf_id?: string;
  org_id?: string;
  nm: string;
  yr: number;
  reg_cd: string;
  act_ty?: string;
  calc_m?: string;
  /** Código físico canonical (p. ej. `KWH`) o legado (`kg/kWh`). */
  unit?: string;
  val?: number;
  /** Preferido GHG Protocol numérico. */
  sc?: number;
  /** Legado `SCOPE_1` \| `SCOPE_2` \| `SCOPE_3`. */
  scope?: string;
  co2_v?: number;
  ch4_v?: number;
  n2o_v?: number;
  hfc_v?: number;
  gwp_ref?: string;
  src?: string;
  src_url?: string;
  dq_t?: number;
  unc_pct?: number;
  ext_aud_dt?: string;
  is_proj?: boolean;
  decar_tr?: number;
  bio_cs?: number;
  st?: string;
  tags?: Record<string, string>;
  crt_at?: string;
  upd_at?: string;
}

export const EmissionFactorMapper = Object.freeze({
  dtoToEntity(dto: EmissionFactorDTO): EmissionFactorEntity {
    return EmissionFactorEntity.fromDTO(dto);
  },

  toPersistence(entity: EmissionFactorEntity, orgId?: string): EmissionFactorPersistence {
    const tg =
      entity.tags && Object.keys(entity.tags).length > 0 ? { ...entity.tags } : undefined;
    return {
      sms_et: 'EMF',
      ...(orgId?.trim() ? { org_id: orgId } : {}),
      emf_id: entity.id,
      nm: entity.name,
      yr: entity.year,
      reg_cd: entity.regionCode,
      act_ty: entity.activityType,
      ...(entity.calculationMethod !== undefined ? { calc_m: entity.calculationMethod } : {}),
      unit: entity.unit,
      val: entity.value,
      sc: entity.scope,
      scope: `SCOPE_${entity.scope}`,
      ...(entity.co2Value !== undefined ? { co2_v: entity.co2Value } : {}),
      ...(entity.ch4Value !== undefined ? { ch4_v: entity.ch4Value } : {}),
      ...(entity.n2oValue !== undefined ? { n2o_v: entity.n2oValue } : {}),
      ...(entity.hfcValue !== undefined ? { hfc_v: entity.hfcValue } : {}),
      gwp_ref: entity.gwpReference,
      src: entity.source,
      ...(entity.sourceUrl?.trim() ? { src_url: entity.sourceUrl.trim() } : {}),
      dq_t: entity.dataQualityTier,
      unc_pct: entity.uncertaintyPercentage,
      ...(entity.externalAuditDate?.trim() ? { ext_aud_dt: entity.externalAuditDate.trim() } : {}),
      is_proj: entity.isProjection,
      decar_tr: entity.decarbonizationTrend,
      ...(entity.biologicalCarbonStorage !== undefined ? { bio_cs: entity.biologicalCarbonStorage } : {}),
      st: entity.status,
      ...(tg !== undefined ? { tags: tg } : {}),
      ...(entity.createdAt ? { crt_at: entity.createdAt } : {}),
      ...(entity.updatedAt ? { upd_at: entity.updatedAt } : {})
    };
  },

  persistenceToDTO(row: EmissionFactorPersistence): EmissionFactorDTO {
    const id = row.emf_id?.trim() || fallbackEmissionFactorId(row);
    const scopePayload = typeof row.sc === 'number' ? row.sc : row.scope;
    return parseEmissionFactorDTO({
      id,
      name: row.nm,
      year: row.yr,
      regionCode: row.reg_cd,
      activityType: row.act_ty ?? 'ELEC',
      scope: scopePayload ?? 'SCOPE_2',
      calculationMethod: row.calc_m,
      unit: row.unit ?? 'kg/kWh',
      value: row.val ?? 0,
      co2Value: row.co2_v,
      ch4Value: row.ch4_v,
      n2oValue: row.n2o_v,
      hfcValue: row.hfc_v,
      gwpReference: safeParseGwp(row.gwp_ref),
      source: row.src?.trim() ? row.src.trim() : 'MANUAL',
      sourceUrl: row.src_url,
      dataQualityTier: normalizeDataQualityTier(row.dq_t),
      uncertaintyPercentage: row.unc_pct ?? 0,
      externalAuditDate: row.ext_aud_dt,
      isProjection: row.is_proj ?? false,
      decarbonizationTrend: row.decar_tr ?? 0,
      biologicalCarbonStorage: row.bio_cs,
      status: safeParseCatalogStatus(row.st),
      tags: row.tags ?? {},
      createdAt: row.crt_at,
      updatedAt: row.upd_at
    });
  }
});
