import { SmsDomainError } from '../shared/sms-domain-error.js';
import { AlertRuleDTO } from './alert-rule.dto.js';

export class AlertRuleEntity {
  public readonly id: string;
  public readonly orgId: string;
  public readonly branchId: string;
  public readonly entityId: string;
  public readonly entityType: AlertRuleDTO['entityType'];
  public readonly name: string;
  public readonly description?: string;
  public readonly alertType: AlertRuleDTO['alertType'];
  public readonly metricName: string;
  public readonly operator: AlertRuleDTO['operator'];
  public readonly threshold: number;
  public readonly aggregationWindowMinutes: number;
  public readonly aggregationMethod: AlertRuleDTO['aggregationMethod'];
  public readonly occurrencesBeforeTrigger: number;
  public readonly priority: AlertRuleDTO['priority'];
  public readonly status: AlertRuleDTO['status'];
  public readonly severityScore: number;
  public readonly notificationChannels: AlertRuleDTO['notificationChannels'];
  public readonly recipients: string[];
  public readonly coolDownMinutes: number;
  public readonly autoAcknowledge: boolean;
  public readonly monitorScope: AlertRuleDTO['monitorScope'];
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
    entityType: AlertRuleDTO['entityType'],
    name: string,
    description: string | undefined,
    alertType: AlertRuleDTO['alertType'],
    metricName: string,
    operator: AlertRuleDTO['operator'],
    threshold: number,
    aggregationWindowMinutes: number,
    aggregationMethod: AlertRuleDTO['aggregationMethod'],
    occurrencesBeforeTrigger: number,
    priority: AlertRuleDTO['priority'],
    status: AlertRuleDTO['status'],
    severityScore: number,
    notificationChannels: AlertRuleDTO['notificationChannels'],
    recipients: readonly string[],
    coolDownMinutes: number,
    autoAcknowledge: boolean,
    monitorScope: AlertRuleDTO['monitorScope'],
    calendarId: string | undefined,
    webhookActionUrl: string | undefined,
    recoveryThreshold: number | undefined,
    tags: Record<string, string>,
    createdAt?: string,
    updatedAt?: string
  ) {
    this.id = id;
    this.orgId = orgId;
    this.branchId = branchId;
    this.entityId = entityId;
    this.entityType = entityType;
    this.name = name;
    if (description !== undefined) this.description = description;
    this.alertType = alertType;
    this.metricName = metricName;
    this.operator = operator;
    this.threshold = threshold;
    this.aggregationWindowMinutes = aggregationWindowMinutes;
    this.aggregationMethod = aggregationMethod;
    this.occurrencesBeforeTrigger = occurrencesBeforeTrigger;
    this.priority = priority;
    this.status = status;
    this.severityScore = severityScore;
    this.notificationChannels = [...notificationChannels];
    this.recipients = [...recipients];
    this.coolDownMinutes = coolDownMinutes;
    this.autoAcknowledge = autoAcknowledge;
    this.monitorScope = monitorScope;
    if (calendarId !== undefined) this.calendarId = calendarId;
    if (webhookActionUrl !== undefined) this.webhookActionUrl = webhookActionUrl;
    if (recoveryThreshold !== undefined) this.recoveryThreshold = recoveryThreshold;
    this.tags = { ...tags };
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.assertIdentity();
  }

  static fromDTO(dto: AlertRuleDTO): AlertRuleEntity {
    return new AlertRuleEntity(
      dto.id,
      dto.orgId,
      dto.branchId,
      dto.entityId,
      dto.entityType,
      dto.name,
      dto.description,
      dto.alertType,
      dto.metricName,
      dto.operator,
      dto.threshold,
      dto.aggregationWindowMinutes,
      dto.aggregationMethod,
      dto.occurrencesBeforeTrigger,
      dto.priority,
      dto.status,
      dto.severityScore,
      dto.notificationChannels,
      dto.recipients,
      dto.coolDownMinutes,
      dto.autoAcknowledge,
      dto.monitorScope,
      dto.calendarId,
      dto.webhookActionUrl,
      dto.recoveryThreshold,
      dto.tags,
      dto.createdAt,
      dto.updatedAt
    );
  }

  assertIdentity(): void {
    if (!this.id?.trim()) throw new SmsDomainError('AlertRule.id required');
    if (!this.orgId?.trim()) throw new SmsDomainError('AlertRule.orgId required');
    if (!this.branchId?.trim()) throw new SmsDomainError('AlertRule.branchId required');
    if (!this.entityId?.trim()) throw new SmsDomainError('AlertRule.entityId required');
    if (!this.name?.trim()) throw new SmsDomainError('AlertRule.name required');
    if (!this.metricName?.trim()) throw new SmsDomainError('AlertRule.metricName required');
    if (!Number.isFinite(this.threshold)) throw new SmsDomainError('AlertRule.threshold invalid');
    if (
      !Number.isFinite(this.severityScore) ||
      this.severityScore < 1 ||
      this.severityScore > 100
    ) {
      throw new SmsDomainError('AlertRule.severityScore invalid');
    }
    if (
      !Number.isFinite(this.aggregationWindowMinutes) ||
      this.aggregationWindowMinutes < 1
    ) {
      throw new SmsDomainError('AlertRule.aggregationWindowMinutes invalid');
    }
    if (
      !Number.isInteger(this.occurrencesBeforeTrigger) ||
      this.occurrencesBeforeTrigger < 1
    ) {
      throw new SmsDomainError('AlertRule.occurrencesBeforeTrigger invalid');
    }
    if (
      !Number.isFinite(this.coolDownMinutes) ||
      this.coolDownMinutes < 0
    ) {
      throw new SmsDomainError('AlertRule.coolDownMinutes invalid');
    }
    if (this.notificationChannels.length < 1) {
      throw new SmsDomainError('AlertRule.notificationChannels required');
    }
  }

  toValue(): AlertRuleDTO {
    return new AlertRuleDTO(
      this.id,
      this.orgId,
      this.branchId,
      this.entityId,
      this.entityType,
      this.name,
      this.description,
      this.alertType,
      this.metricName,
      this.operator,
      this.threshold,
      this.aggregationWindowMinutes,
      this.aggregationMethod,
      this.occurrencesBeforeTrigger,
      this.priority,
      this.status,
      this.severityScore,
      this.notificationChannels,
      this.recipients,
      this.coolDownMinutes,
      this.autoAcknowledge,
      this.monitorScope,
      this.calendarId,
      this.webhookActionUrl,
      this.recoveryThreshold,
      this.tags,
      this.createdAt,
      this.updatedAt
    );
  }
}
