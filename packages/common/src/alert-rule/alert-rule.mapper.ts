import type { SmsEntityTag } from '../shared/sms-entity-tag.js';
import { z } from 'zod';
import {
  AlertRuleNotificationChannelSchema,
  parseAlertRuleDTO
} from './alert-rule.dto.js';
import type { AlertRuleDTO } from './alert-rule.dto.js';
import { AlertRuleEntity } from './alert-rule.entity.js';

const NotificationChannelsPersistSchema = z.array(AlertRuleNotificationChannelSchema);
const RecipientsPersistSchema = z.array(z.string().min(1));

function stringifyJson(value: unknown): string {
  return JSON.stringify(value);
}

function parseNotificationChannels(
  raw: string | undefined
): z.infer<typeof AlertRuleNotificationChannelSchema>[] | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const j = JSON.parse(raw) as unknown;
    const p = NotificationChannelsPersistSchema.safeParse(j);
    return p.success ? p.data : undefined;
  } catch {
    return undefined;
  }
}

function parseRecipientsJson(raw: string | undefined): string[] | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const j = JSON.parse(raw) as unknown;
    const p = RecipientsPersistSchema.safeParse(j);
    return p.success ? p.data : undefined;
  } catch {
    return undefined;
  }
}

function fallbackAlertRuleId(
  row: Pick<AlertRulePersistence, 'br_id' | 'ent_id' | 'alert_ty' | 'metric_nm'>
): string {
  const m = row.metric_nm?.trim() ? row.metric_nm.trim() : 'm';
  const at = row.alert_ty?.trim() ? row.alert_ty.trim() : 'alrt';
  return `alr_${row.br_id}_${row.ent_id}_${at}_${m}`.replace(/[^a-zA-Z0-9_#-]/g, '_').slice(0, 120);
}

export interface AlertRulePersistence {
  sms_et: Extract<SmsEntityTag, 'ALR'>;
  alr_id?: string;
  org_id?: string;
  br_id: string;
  ent_id: string;
  ent_ty?: string;
  nm: string;
  dsc?: string;
  /** Familia / categoría motor (compat: `EFFICIENCY`). */
  alert_ty?: string;
  metric_nm?: string;
  op?: string;
  thr?: number;
  agg_win_m?: number;
  agg_meth?: string;
  occ_tr?: number;
  pri?: string;
  st?: string;
  sev_scr?: number;
  ntf_js?: string;
  rcp_js?: string;
  cd_m?: number;
  auto_ack?: boolean;
  mon_scope?: string;
  cal_id?: string;
  wh_url?: string;
  recv_thr?: number;
  tags?: Record<string, string>;
  crt_at?: string;
  upd_at?: string;
}

export const AlertRuleMapper = Object.freeze({
  dtoToEntity(dto: AlertRuleDTO): AlertRuleEntity {
    return AlertRuleEntity.fromDTO(dto);
  },

  toPersistence(entity: AlertRuleEntity): AlertRulePersistence {
    const tg =
      entity.tags && Object.keys(entity.tags).length > 0 ? { ...entity.tags } : undefined;
    return {
      sms_et: 'ALR',
      alr_id: entity.id,
      org_id: entity.orgId,
      br_id: entity.branchId,
      ent_id: entity.entityId,
      ent_ty: entity.entityType,
      nm: entity.name,
      alert_ty: entity.alertType,
      metric_nm: entity.metricName,
      op: entity.operator,
      thr: entity.threshold,
      agg_win_m: entity.aggregationWindowMinutes,
      agg_meth: entity.aggregationMethod,
      occ_tr: entity.occurrencesBeforeTrigger,
      pri: entity.priority,
      st: entity.status,
      sev_scr: entity.severityScore,
      ntf_js: stringifyJson(entity.notificationChannels),
      rcp_js: stringifyJson(entity.recipients),
      cd_m: entity.coolDownMinutes,
      auto_ack: entity.autoAcknowledge,
      mon_scope: entity.monitorScope,
      ...(entity.description?.trim() ? { dsc: entity.description.trim() } : {}),
      ...(entity.calendarId?.trim() ? { cal_id: entity.calendarId.trim() } : {}),
      ...(entity.webhookActionUrl?.trim() ? { wh_url: entity.webhookActionUrl.trim() } : {}),
      ...(entity.recoveryThreshold !== undefined ? { recv_thr: entity.recoveryThreshold } : {}),
      ...(tg !== undefined ? { tags: tg } : {}),
      ...(entity.createdAt ? { crt_at: entity.createdAt } : {}),
      ...(entity.updatedAt ? { upd_at: entity.updatedAt } : {})
    };
  },

  persistenceToDTO(row: AlertRulePersistence): AlertRuleDTO {
    const id = row.alr_id?.trim() || fallbackAlertRuleId(row);
    return parseAlertRuleDTO({
      id,
      orgId: row.org_id?.trim() ? row.org_id.trim() : 'sys',
      branchId: row.br_id,
      entityId: row.ent_id,
      entityType: row.ent_ty,
      name: row.nm,
      description: row.dsc,
      alertType: row.alert_ty ?? 'OVER_CONSUMPTION',
      metricName: row.metric_nm,
      operator: row.op,
      threshold: row.thr ?? 0,
      aggregationWindowMinutes: row.agg_win_m,
      aggregationMethod: row.agg_meth,
      occurrencesBeforeTrigger: row.occ_tr,
      priority: row.pri,
      status: row.st,
      severityScore: row.sev_scr,
      notificationChannels: parseNotificationChannels(row.ntf_js),
      recipients: parseRecipientsJson(row.rcp_js),
      coolDownMinutes: row.cd_m,
      autoAcknowledge: row.auto_ack,
      monitorScope: row.mon_scope,
      calendarId: row.cal_id,
      webhookActionUrl: row.wh_url,
      recoveryThreshold: row.recv_thr,
      tags: row.tags ?? {},
      createdAt: row.crt_at,
      updatedAt: row.upd_at
    });
  }
});
