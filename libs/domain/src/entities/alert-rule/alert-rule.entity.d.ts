import { AlertRuleDTO } from '@sms/common';
export declare class AlertRuleEntity {
    readonly id: string;
    readonly orgId: string;
    readonly branchId: string;
    readonly entityId: string;
    readonly entityType: AlertRuleDTO['entityType'];
    readonly name: string;
    readonly description?: string;
    readonly alertType: AlertRuleDTO['alertType'];
    readonly metricName: string;
    readonly operator: AlertRuleDTO['operator'];
    readonly threshold: number;
    readonly aggregationWindowMinutes: number;
    readonly aggregationMethod: AlertRuleDTO['aggregationMethod'];
    readonly occurrencesBeforeTrigger: number;
    readonly priority: AlertRuleDTO['priority'];
    readonly status: AlertRuleDTO['status'];
    readonly severityScore: number;
    readonly notificationChannels: AlertRuleDTO['notificationChannels'];
    readonly recipients: string[];
    readonly coolDownMinutes: number;
    readonly autoAcknowledge: boolean;
    readonly monitorScope: AlertRuleDTO['monitorScope'];
    readonly calendarId?: string;
    readonly webhookActionUrl?: string;
    readonly recoveryThreshold?: number;
    readonly tags: Record<string, string>;
    readonly createdAt?: string;
    readonly updatedAt?: string;
    constructor(id: string, orgId: string, branchId: string, entityId: string, entityType: AlertRuleDTO['entityType'], name: string, description: string | undefined, alertType: AlertRuleDTO['alertType'], metricName: string, operator: AlertRuleDTO['operator'], threshold: number, aggregationWindowMinutes: number, aggregationMethod: AlertRuleDTO['aggregationMethod'], occurrencesBeforeTrigger: number, priority: AlertRuleDTO['priority'], status: AlertRuleDTO['status'], severityScore: number, notificationChannels: AlertRuleDTO['notificationChannels'], recipients: readonly string[], coolDownMinutes: number, autoAcknowledge: boolean, monitorScope: AlertRuleDTO['monitorScope'], calendarId: string | undefined, webhookActionUrl: string | undefined, recoveryThreshold: number | undefined, tags: Record<string, string>, createdAt?: string, updatedAt?: string);
    static fromDTO(dto: AlertRuleDTO): AlertRuleEntity;
    assertIdentity(): void;
    toValue(): AlertRuleDTO;
}
//# sourceMappingURL=alert-rule.entity.d.ts.map