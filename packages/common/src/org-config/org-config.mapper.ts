import type { SmsEntityTag } from '../shared/sms-entity-tag.js';
import { OrgConfigEntity } from './org-config.entity.js';
import type { OrgConfigDTO } from './org-config.dto.js';

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
      sub_plan: entity.subscriptionPlan
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
  }
});
