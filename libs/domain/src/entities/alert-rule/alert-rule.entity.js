import { DomainInvariantError } from '../../exceptions/domain-invariant.error.js';
import { AlertRuleDTO } from '@sms/common';
export class AlertRuleEntity {
    id;
    orgId;
    branchId;
    entityId;
    entityType;
    name;
    description;
    alertType;
    metricName;
    operator;
    threshold;
    aggregationWindowMinutes;
    aggregationMethod;
    occurrencesBeforeTrigger;
    priority;
    status;
    severityScore;
    notificationChannels;
    recipients;
    coolDownMinutes;
    autoAcknowledge;
    monitorScope;
    calendarId;
    webhookActionUrl;
    recoveryThreshold;
    tags;
    createdAt;
    updatedAt;
    constructor(id, orgId, branchId, entityId, entityType, name, description, alertType, metricName, operator, threshold, aggregationWindowMinutes, aggregationMethod, occurrencesBeforeTrigger, priority, status, severityScore, notificationChannels, recipients, coolDownMinutes, autoAcknowledge, monitorScope, calendarId, webhookActionUrl, recoveryThreshold, tags, createdAt, updatedAt) {
        this.id = id;
        this.orgId = orgId;
        this.branchId = branchId;
        this.entityId = entityId;
        this.entityType = entityType;
        this.name = name;
        if (description !== undefined)
            this.description = description;
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
        if (calendarId !== undefined)
            this.calendarId = calendarId;
        if (webhookActionUrl !== undefined)
            this.webhookActionUrl = webhookActionUrl;
        if (recoveryThreshold !== undefined)
            this.recoveryThreshold = recoveryThreshold;
        this.tags = { ...tags };
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.assertIdentity();
    }
    static fromDTO(dto) {
        return new AlertRuleEntity(dto.id, dto.orgId, dto.branchId, dto.entityId, dto.entityType, dto.name, dto.description, dto.alertType, dto.metricName, dto.operator, dto.threshold, dto.aggregationWindowMinutes, dto.aggregationMethod, dto.occurrencesBeforeTrigger, dto.priority, dto.status, dto.severityScore, dto.notificationChannels, dto.recipients, dto.coolDownMinutes, dto.autoAcknowledge, dto.monitorScope, dto.calendarId, dto.webhookActionUrl, dto.recoveryThreshold, dto.tags, dto.createdAt, dto.updatedAt);
    }
    assertIdentity() {
        if (!this.id?.trim())
            throw new DomainInvariantError('AlertRule.id required');
        if (!this.orgId?.trim())
            throw new DomainInvariantError('AlertRule.orgId required');
        if (!this.branchId?.trim())
            throw new DomainInvariantError('AlertRule.branchId required');
        if (!this.entityId?.trim())
            throw new DomainInvariantError('AlertRule.entityId required');
        if (!this.name?.trim())
            throw new DomainInvariantError('AlertRule.name required');
        if (!this.metricName?.trim())
            throw new DomainInvariantError('AlertRule.metricName required');
        if (!Number.isFinite(this.threshold))
            throw new DomainInvariantError('AlertRule.threshold invalid');
        if (!Number.isFinite(this.severityScore) ||
            this.severityScore < 1 ||
            this.severityScore > 100) {
            throw new DomainInvariantError('AlertRule.severityScore invalid');
        }
        if (!Number.isFinite(this.aggregationWindowMinutes) ||
            this.aggregationWindowMinutes < 1) {
            throw new DomainInvariantError('AlertRule.aggregationWindowMinutes invalid');
        }
        if (!Number.isInteger(this.occurrencesBeforeTrigger) ||
            this.occurrencesBeforeTrigger < 1) {
            throw new DomainInvariantError('AlertRule.occurrencesBeforeTrigger invalid');
        }
        if (!Number.isFinite(this.coolDownMinutes) ||
            this.coolDownMinutes < 0) {
            throw new DomainInvariantError('AlertRule.coolDownMinutes invalid');
        }
        if (this.notificationChannels.length < 1) {
            throw new DomainInvariantError('AlertRule.notificationChannels required');
        }
    }
    toValue() {
        return new AlertRuleDTO(this.id, this.orgId, this.branchId, this.entityId, this.entityType, this.name, this.description, this.alertType, this.metricName, this.operator, this.threshold, this.aggregationWindowMinutes, this.aggregationMethod, this.occurrencesBeforeTrigger, this.priority, this.status, this.severityScore, this.notificationChannels, this.recipients, this.coolDownMinutes, this.autoAcknowledge, this.monitorScope, this.calendarId, this.webhookActionUrl, this.recoveryThreshold, this.tags, this.createdAt, this.updatedAt);
    }
}
//# sourceMappingURL=alert-rule.entity.js.map