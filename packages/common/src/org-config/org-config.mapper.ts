import type { SmsEntityTag } from '../shared/sms-entity-tag.js';
import { OrgConfigEntity } from './org-config.entity.js';
import type { OrgConfigDTO } from './org-config.dto.js';
import type { OrganizationDTO } from './organization.dto.js';
import type { LifecycleStatus } from '../shared/graphql-setup-enums.js';

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
  adm_nm?: string;
  adm_em?: string;
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
      unit_sys: entity.unitSystem,
      def_tz: entity.defaultTimeZone,
      fy_start: entity.fiscalYearStart,
      adm_nm: entity.adminContact?.name,
      adm_em: entity.adminContact?.email,
      adm_ph: entity.adminContact?.phone,
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
    return {
      orgId: row.org_id,
      ...OrgConfigMapper.persistenceToDTO(row),
      legalName: row.leg_nm ?? row.nm,
      ...(row.web_url ? { websiteUrl: row.web_url } : {}),
      ...(row.logo_url ? { logoUrl: row.logo_url } : {}),
      primaryLanguage: row.prim_lang ?? 'en',
      unitSystem: row.unit_sys ?? 'METRIC',
      defaultTimeZone: row.def_tz ?? 'UTC',
      fiscalYearStart: row.fy_start ?? 1,
      adminContact: {
        name: row.adm_nm ?? 'N/A',
        email: row.adm_em ?? 'N/A',
        phone: row.adm_ph ?? 'N/A'
      },
      esgFrameworks: Array.isArray(row.esg_fw) ? row.esg_fw : [],
      status: row.st ?? 'ACTIVE',
      ...(row.crt_at ? { createdAt: row.crt_at } : {}),
      ...(row.upd_at ? { updatedAt: row.upd_at } : {})
    };
  }
});
