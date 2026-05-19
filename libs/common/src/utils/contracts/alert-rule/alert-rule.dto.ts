import { z } from 'zod';
import { SmsIdSchema } from '../../validation/schemas/sms-id.schema.js';

/** Tipo de entidad monitoreada. */
export const AlertRuleEntityTypeSchema = z.enum([
  'METER',
  'ASSET',
  'BUILDING',
  'COST_CENTER',
  'TARIFF'
]);

/** Familia de alerta (motor de detección). */
export const AlertRuleDetectionTypeSchema = z.enum([
  'OVER_CONSUMPTION',
  'LEAK',
  'POWER_QUALITY',
  'CONNECTIVITY',
  'BUDGET_EXCEEDED'
]);

export const AlertRuleThresholdOperatorSymbolSchema = z.enum(['>', '<', '>=', '<=', '==', '!=']);

export const AlertRuleAggregationMethodSchema = z.enum(['SUM', 'AVG', 'MAX', 'MIN', 'LAST', 'DELTA']);

export const AlertRulePrioritySchema = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']);

export const AlertRuleRuleStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'MUTED']);

export const AlertRuleMonitorScopeSchema = z.enum(['WORKING_HOURS', 'NON_WORKING_HOURS', '24_7']);

export const AlertRuleNotificationChannelSchema = z.enum([
  'EMAIL',
  'SMS',
  'PUSH',
  'WEBHOOK',
  'WHATSAPP',
  'SLACK'
]);

function coerceDetectionType(input: unknown): unknown {
  const s = String(input ?? '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_');
  if (!s) return input;
  if (s === 'EFFICIENCY' || s === 'OVERCONSUMPTION') return 'OVER_CONSUMPTION';
  return input;
}

function coerceDetectionTypeWithDefault(input: unknown): unknown {
  if (input === undefined || input === null || String(input).trim() === '')
    return 'OVER_CONSUMPTION';
  return coerceDetectionType(input);
}

function coerceThresholdOperatorWithDefault(input: unknown): unknown {
  if (input === undefined || input === null || String(input).trim() === '') return '>';
  return coerceThresholdOperator(input);
}

function coercePriorityWithDefault(input: unknown): unknown {
  if (input === undefined || input === null || String(input).trim() === '') return 'MEDIUM';
  return coercePriority(input);
}

function coerceRuleStatusWithDefault(input: unknown): unknown {
  if (input === undefined || input === null || String(input).trim() === '') return 'ACTIVE';
  return coerceRuleStatus(input);
}

function coerceThresholdOperator(input: unknown): unknown {
  const s = String(input ?? '').trim().toUpperCase();
  if (!s) return input;
  if (s === 'GREATER_THAN' || s === 'GT') return '>';
  if (s === 'LESS_THAN' || s === 'LT') return '<';
  if (s === 'GTE' || s === 'GREATER_THAN_OR_EQUAL') return '>=';
  if (s === 'LTE' || s === 'LESS_THAN_OR_EQUAL') return '<=';
  if (s === 'EQ' || s === 'EQUAL' || s === 'EQUALS') return '==';
  if (s === 'NE' || s === 'NOT_EQUAL' || s === 'NOT_EQUALS') return '!=';
  return input;
}

function coercePriority(input: unknown): unknown {
  const s = String(input ?? '')
    .trim()
    .toUpperCase();
  if (!s) return input;
  if (s === 'P1_CRITICAL' || s === 'P1') return 'CRITICAL';
  if (s === 'P2' || s === 'P2_HIGH') return 'HIGH';
  if (s === 'P3' || s === 'P3_MEDIUM') return 'MEDIUM';
  if (s === 'P4_LOW') return 'LOW';
  return input;
}

function coerceRuleStatus(input: unknown): unknown {
  const s = String(input ?? '')
    .trim()
    .toUpperCase();
  if (!s) return input;
  if (s === 'ENABLED' || s === 'ENABLE') return 'ACTIVE';
  if (s === 'DISABLED' || s === 'DISABLE') return 'INACTIVE';
  return input;
}

function coerceMonitorScope(input: unknown): unknown {
  const s = String(input ?? '').trim().toUpperCase();
  if (!s) return input;
  if (s === '24/7' || s === '24_7' || s === '24X7' || s === 'ALL_HOURS') return '24_7';
  if (s === 'NONWORKING' || s === 'NON_WORKING' || s === 'OFF_HOURS')
    return 'NON_WORKING_HOURS';
  if (s === 'WORKING' || s === 'BUSINESS_HOURS') return 'WORKING_HOURS';
  return input;
}

function coerceMonitorScopeWithDefault(input: unknown): unknown {
  if (input === undefined || input === null || String(input).trim() === '') return '24_7';
  return coerceMonitorScope(input);
}

function coerceEntityType(input: unknown): unknown {
  const s = String(input ?? '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_');
  if (!s) return input;
  if (s === 'COSTCENTER') return 'COST_CENTER';
  return input;
}

function coerceEntityTypeWithDefault(input: unknown): unknown {
  if (input === undefined || input === null || String(input).trim() === '') return 'ASSET';
  return coerceEntityType(input);
}

function coerceMetricNameWithDefault(input: unknown): unknown {
  if (input === undefined || input === null || String(input).trim() === '') return 'active_power';
  return String(input).trim();
}

const tagsSchema = z.record(z.string(), z.string()).default({});

export function generateAlertRuleId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  return typeof c?.randomUUID === 'function'
    ? c.randomUUID()
    : `alr_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export const AlertRuleDTOSchema = z.object({
  id: SmsIdSchema.optional(),
  orgId: SmsIdSchema,
  branchId: SmsIdSchema,
  entityId: SmsIdSchema,
  entityType: z.preprocess(coerceEntityTypeWithDefault, AlertRuleEntityTypeSchema),
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  alertType: z.preprocess(coerceDetectionTypeWithDefault, AlertRuleDetectionTypeSchema),
  metricName: z.preprocess(coerceMetricNameWithDefault, z.string().min(1)),
  operator: z.preprocess(coerceThresholdOperatorWithDefault, AlertRuleThresholdOperatorSymbolSchema),
  threshold: z.number().finite(),
  aggregationWindowMinutes: z.number().int().positive().max(525600).default(15),
  aggregationMethod: AlertRuleAggregationMethodSchema.default('AVG'),
  occurrencesBeforeTrigger: z.number().int().min(1).max(1000).default(3),
  priority: z.preprocess(coercePriorityWithDefault, AlertRulePrioritySchema),
  status: z.preprocess(coerceRuleStatusWithDefault, AlertRuleRuleStatusSchema),
  severityScore: z.number().int().min(1).max(100).default(50),
  notificationChannels: z.array(AlertRuleNotificationChannelSchema).default(['EMAIL']),
  recipients: z.array(z.string().min(1)).default([]),
  coolDownMinutes: z.number().int().min(0).max(10080).default(60),
  autoAcknowledge: z.boolean().default(false),
  monitorScope: z.preprocess(coerceMonitorScopeWithDefault, AlertRuleMonitorScopeSchema),
  calendarId: z.string().min(1).optional(),
  webhookActionUrl: z.string().min(4).optional(),
  recoveryThreshold: z.number().finite().optional(),
  tags: tagsSchema,
  createdAt: z.string().min(1).optional(),
  updatedAt: z.string().min(1).optional()
});

export type AlertRuleDTOInput = z.infer<typeof AlertRuleDTOSchema>;

export class AlertRuleDTO {
  public readonly id: string;
  public readonly orgId: string;
  public readonly branchId: string;
  public readonly entityId: string;
  public readonly entityType: z.infer<typeof AlertRuleEntityTypeSchema>;
  public readonly name: string;
  public readonly description?: string;
  public readonly alertType: z.infer<typeof AlertRuleDetectionTypeSchema>;
  public readonly metricName: string;
  public readonly operator: z.infer<typeof AlertRuleThresholdOperatorSymbolSchema>;
  public readonly threshold: number;
  public readonly aggregationWindowMinutes: number;
  public readonly aggregationMethod: z.infer<typeof AlertRuleAggregationMethodSchema>;
  public readonly occurrencesBeforeTrigger: number;
  public readonly priority: z.infer<typeof AlertRulePrioritySchema>;
  public readonly status: z.infer<typeof AlertRuleRuleStatusSchema>;
  public readonly severityScore: number;
  public readonly notificationChannels: z.infer<typeof AlertRuleNotificationChannelSchema>[];
  public readonly recipients: string[];
  public readonly coolDownMinutes: number;
  public readonly autoAcknowledge: boolean;
  public readonly monitorScope: z.infer<typeof AlertRuleMonitorScopeSchema>;
  public readonly calendarId?: string;
  public readonly webhookActionUrl?: string;
  public readonly recoveryThreshold?: number;
  public readonly tags: Record<string, string>;
  public readonly createdAt?: string;
  public readonly updatedAt?: string;

  constructor(
    id: string,
    orgId: string,
    branchId: string,
    entityId: string,
    entityType: z.infer<typeof AlertRuleEntityTypeSchema>,
    name: string,
    description: string | null | undefined,
    alertType: z.infer<typeof AlertRuleDetectionTypeSchema>,
    metricName: string,
    operator: z.infer<typeof AlertRuleThresholdOperatorSymbolSchema>,
    threshold: number,
    aggregationWindowMinutes: number | null | undefined,
    aggregationMethod: z.infer<typeof AlertRuleAggregationMethodSchema>,
    occurrencesBeforeTrigger: number | null | undefined,
    priority: z.infer<typeof AlertRulePrioritySchema>,
    status: z.infer<typeof AlertRuleRuleStatusSchema>,
    severityScore: number | null | undefined,
    notificationChannels:
      | readonly z.infer<typeof AlertRuleNotificationChannelSchema>[]
      | null
      | undefined,
    recipients: readonly string[] | null | undefined,
    coolDownMinutes: number | null | undefined,
    autoAcknowledge: boolean | null | undefined,
    monitorScope: z.infer<typeof AlertRuleMonitorScopeSchema>,
    calendarId: string | null | undefined,
    webhookActionUrl: string | null | undefined,
    recoveryThreshold: number | null | undefined,
    tags: Record<string, string> | null | undefined,
    createdAt?: string,
    updatedAt?: string
  ) {
    this.id = id;
    this.orgId = orgId.trim();
    this.branchId = branchId.trim();
    this.entityId = entityId.trim();
    this.entityType = entityType;
    this.name = name.trim();
    if (description?.trim()) this.description = description.trim();
    this.alertType = alertType;
    this.metricName = metricName.trim();
    this.operator = operator;
    this.threshold = threshold;
    const win = aggregationWindowMinutes ?? 15;
    this.aggregationWindowMinutes = win < 1 ? 15 : win > 525600 ? 525600 : win;
    this.aggregationMethod = aggregationMethod;
    const occ = occurrencesBeforeTrigger ?? 3;
    this.occurrencesBeforeTrigger = occ < 1 ? 1 : occ > 1000 ? 1000 : occ;
    this.priority = priority;
    this.status = status;
    const sev = severityScore ?? 50;
    this.severityScore = Math.min(100, Math.max(1, Math.floor(sev)));
    const ch = notificationChannels?.length
      ? [...notificationChannels]
      : ['EMAIL'];
    this.notificationChannels = ch as z.infer<typeof AlertRuleNotificationChannelSchema>[];
    this.recipients = (recipients ?? []).map((r) => r.trim()).filter(Boolean);
    const cd = coolDownMinutes ?? 60;
    this.coolDownMinutes = cd < 0 ? 0 : cd > 10080 ? 10080 : cd;
    this.autoAcknowledge = autoAcknowledge ?? false;
    this.monitorScope = monitorScope;
    if (calendarId?.trim()) this.calendarId = calendarId.trim();
    if (webhookActionUrl?.trim()) this.webhookActionUrl = webhookActionUrl.trim();
    if (recoveryThreshold !== null && recoveryThreshold !== undefined && Number.isFinite(recoveryThreshold))
      this.recoveryThreshold = recoveryThreshold;
    this.tags = typeof tags === 'object' && tags !== null ? { ...tags } : {};
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

export const parseAlertRuleDTO = (input: unknown): AlertRuleDTO => {
  const d = AlertRuleDTOSchema.parse(input);
  const id = d.id?.trim() ? d.id.trim() : generateAlertRuleId();
  return new AlertRuleDTO(
    id,
    d.orgId,
    d.branchId,
    d.entityId,
    d.entityType,
    d.name,
    d.description,
    d.alertType,
    d.metricName,
    d.operator,
    d.threshold,
    d.aggregationWindowMinutes,
    d.aggregationMethod,
    d.occurrencesBeforeTrigger,
    d.priority,
    d.status,
    d.severityScore,
    d.notificationChannels,
    d.recipients,
    d.coolDownMinutes,
    d.autoAcknowledge,
    d.monitorScope,
    d.calendarId,
    d.webhookActionUrl,
    d.recoveryThreshold,
    d.tags,
    d.createdAt,
    d.updatedAt
  );
};

export const safeParseAlertRuleDTO = (input: unknown) => AlertRuleDTOSchema.safeParse(input);
