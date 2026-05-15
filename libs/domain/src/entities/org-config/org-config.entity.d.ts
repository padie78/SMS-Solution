import type { LifecycleStatus } from '@sms/common';
import type { OrgConfigDTO } from '@sms/common';
import { OrganizationDTO } from '@sms/common';
export declare class OrgConfigEntity {
    readonly orgId: string;
    readonly name: string;
    readonly taxId: string;
    readonly hqAddress: string;
    readonly totalGlobalM2: number;
    readonly industrySector: OrgConfigDTO['industrySector'];
    readonly currency: OrgConfigDTO['currency'];
    readonly reportingCurrency: OrgConfigDTO['reportingCurrency'];
    readonly minConfidence: number;
    readonly baselineYear: number;
    readonly reductionTarget: number;
    readonly targetYear: number;
    readonly subscriptionPlan: OrgConfigDTO['subscriptionPlan'];
    readonly legalName: string;
    readonly websiteUrl: string | undefined;
    readonly logoUrl: string | undefined;
    readonly primaryLanguage: string;
    readonly unitSystem: 'METRIC' | 'IMPERIAL';
    readonly defaultTimeZone: string;
    readonly fiscalYearStart: number;
    readonly adminContact: OrganizationDTO['adminContact'];
    readonly esgFrameworks: readonly string[];
    readonly status: LifecycleStatus;
    readonly createdAt?: string | undefined;
    readonly updatedAt?: string | undefined;
    constructor(orgId: string, name: string, taxId: string, hqAddress: string, totalGlobalM2: number, industrySector: OrgConfigDTO['industrySector'], currency: OrgConfigDTO['currency'], reportingCurrency: OrgConfigDTO['reportingCurrency'], minConfidence: number, baselineYear: number, reductionTarget: number, targetYear: number, subscriptionPlan: OrgConfigDTO['subscriptionPlan'], legalName: string, websiteUrl: string | undefined, logoUrl: string | undefined, primaryLanguage: string, unitSystem: 'METRIC' | 'IMPERIAL', defaultTimeZone: string, fiscalYearStart: number, adminContact: OrganizationDTO['adminContact'], esgFrameworks?: readonly string[], status?: LifecycleStatus, createdAt?: string | undefined, updatedAt?: string | undefined);
    static fromMutation(orgId: string, dto: OrgConfigDTO): OrgConfigEntity;
    static fromOrganizationDTO(dto: OrganizationDTO): OrgConfigEntity;
    assertIdentity(): void;
    toValue(): OrgConfigDTO;
    toOrganizationDTO(): OrganizationDTO;
}
//# sourceMappingURL=org-config.entity.d.ts.map