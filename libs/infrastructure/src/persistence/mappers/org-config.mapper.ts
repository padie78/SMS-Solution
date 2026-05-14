import type { SmsEntityTag } from '@sms/contracts';
import { OrgConfigEntity } from '@sms/domain';
import type { OrgConfigDTO } from '@sms/contracts';
import { OrganizationDTO } from '@sms/contracts';
import type { LifecycleStatus } from '@sms/contracts';

export interface OrgConfigPersistence {
  sms_et: Extract<SmsEntityTag, 'ORG_CFG'>;
  org_id: string;
  nm: string;
  tax_id: string;
  hq_addr: string;
  tot_glob_m2: number;
  ind_sec: string;
  curr: string;
  rep_curr: string;
  min_conf: number;
  base_yr: number;
  red_tgt: number;
  tgt_yr: number;
  sub_plan: string;
  leg_nm?: string;
  web_url?: string;
  logo_url?: string;
  prim_lang?: string;
  unit_sys?: 'METRIC' | 'IMPERIAL';
  def_tz?: string;
  fy_start?: number;
  /**
   * Enterprise estándar: objeto anidado (Dynamo Map).
   * Back-compat: si no existe, se aceptan los campos legacy `adm_*`.
   */
  admin_contact?: { name: string; email: string; phone?: string };
  /** Legacy (deprecated). */
  adm_nm?: string;
  /** Legacy (deprecated). */
  adm_em?: string;
  /** Legacy (deprecated). */
  adm_ph?: string;
  esg_fw?: string[];
  st?: LifecycleStatus;
  crt_at?: string;
  upd_at?: string;
}

export interface OrganizationDynamoItem extends OrgConfigPersistence {
  PK: string;
  SK: string;
  type: 'ORGANIZATION';
}

export const OrgConfigMapper = Object.freeze({
  dtoToEntity(orgId: string, dto: OrgConfigDTO): OrgConfigEntity {
    return OrgConfigEntity.fromMutation(orgId, dto);
  },

  toPersistence(entity: OrgConfigEntity): OrgConfigPersistence {
    return {
      sms_et: 'ORG_CFG',
      org_id: entity.orgId,
      nm: entity.name,
      tax_id: entity.taxId,
      hq_addr: entity.hqAddress,
      tot_glob_m2: entity.totalGlobalM2,
      ind_sec: entity.industrySector,
      curr: entity.currency,
      rep_curr: entity.reportingCurrency,
      min_conf: entity.minConfidence,
      base_yr: entity.baselineYear,
      red_tgt: entity.reductionTarget,
      tgt_yr: entity.targetYear,
      sub_plan: entity.subscriptionPlan,
      leg_nm: entity.legalName,
      ...(entity.websiteUrl ? { web_url: entity.websiteUrl } : {}),
      ...(entity.logoUrl ? { logo_url: entity.logoUrl } : {}),
      prim_lang: entity.primaryLanguage,
      unit_sys: entity.unitSystem ?? 'METRIC',
      def_tz: entity.defaultTimeZone,
      fy_start: entity.fiscalYearStart ?? 1,
      admin_contact: {
        name: entity.adminContact?.name ?? 'N/A',
        email: entity.adminContact?.email ?? 'N/A',
        ...(entity.adminContact?.phone ? { phone: entity.adminContact.phone } : {})
      },
      esg_fw: [...(entity.esgFrameworks ?? [])],
      st: entity.status,
      ...(entity.createdAt ? { crt_at: entity.createdAt } : {}),
      ...(entity.updatedAt ? { upd_at: entity.updatedAt } : {})
    };
  },

  /** Item listo para single-table Dynamo (ORG# · METADATA). */
  toOrganizationDynamoItem(entity: OrgConfigEntity): OrganizationDynamoItem {
    return {
      PK: `ORG#${entity.orgId}`,
      SK: 'METADATA',
      type: 'ORGANIZATION',
      ...OrgConfigMapper.toPersistence(entity)
    };
  },

  persistenceToDTO(row: OrgConfigPersistence): OrgConfigDTO {
    return {
      name: row.nm,
      taxId: row.tax_id,
      hqAddress: row.hq_addr,
      totalGlobalM2: row.tot_glob_m2,
      industrySector: row.ind_sec as OrgConfigDTO['industrySector'],
      currency: row.curr as OrgConfigDTO['currency'],
      reportingCurrency: row.rep_curr as OrgConfigDTO['reportingCurrency'],
      minConfidence: row.min_conf,
      baselineYear: row.base_yr,
      reductionTarget: row.red_tgt,
      targetYear: row.tgt_yr,
      subscriptionPlan: row.sub_plan as OrgConfigDTO['subscriptionPlan']
    };
  },

  persistenceToOrganizationDTO(row: OrgConfigPersistence): OrganizationDTO {
    const adminContact =
      row.admin_contact ??
      (row.adm_nm || row.adm_em || row.adm_ph
        ? {
            name: row.adm_nm ?? 'N/A',
            email: row.adm_em ?? 'N/A',
            ...(row.adm_ph ? { phone: row.adm_ph } : {})
          }
        : { name: 'N/A', email: 'N/A' });

    const dto = new OrganizationDTO(
      row.org_id,
      row.nm,
      row.leg_nm ?? row.nm,
      row.tax_id,
      row.ind_sec as OrgConfigDTO['industrySector'],
      row.hq_addr,
      row.web_url,
      row.logo_url,
      row.prim_lang ?? 'en',
      (row.unit_sys ?? 'METRIC') as 'METRIC' | 'IMPERIAL',
      row.curr as OrgConfigDTO['currency'],
      row.rep_curr as OrgConfigDTO['reportingCurrency'],
      row.fy_start ?? 1,
      row.tot_glob_m2,
      row.base_yr,
      row.tgt_yr,
      row.red_tgt,
      row.min_conf,
      Array.isArray(row.esg_fw) ? row.esg_fw : [],
      row.sub_plan as OrgConfigDTO['subscriptionPlan'],
      row.st ?? 'ACTIVE',
      adminContact,
      row.crt_at,
      row.upd_at
    );
    (dto as { defaultTimeZone: string }).defaultTimeZone = row.def_tz ?? 'UTC';
    return dto;
  }
});
