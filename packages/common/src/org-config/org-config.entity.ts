import { SmsDomainError } from '../shared/sms-domain-error.js';
import type { LifecycleStatus } from '../shared/graphql-setup-enums.js';
import type { OrgConfigDTO } from './org-config.dto.js';
import type { OrganizationDTO } from './organization.dto.js';

export class OrgConfigEntity {
  constructor(
    public readonly orgId: string,
    public readonly name: string,
    public readonly taxId: string,
    public readonly hqAddress: string,
    public readonly totalGlobalM2: number,
    public readonly industrySector: OrgConfigDTO['industrySector'],
    public readonly currency: OrgConfigDTO['currency'],
    public readonly reportingCurrency: OrgConfigDTO['reportingCurrency'],
    public readonly minConfidence: number,
    public readonly baselineYear: number,
    public readonly reductionTarget: number,
    public readonly targetYear: number,
    public readonly subscriptionPlan: OrgConfigDTO['subscriptionPlan'],
    public readonly legalName: string,
    public readonly websiteUrl: string | undefined,
    public readonly logoUrl: string | undefined,
    public readonly primaryLanguage: string,
    public readonly unitSystem: 'METRIC' | 'IMPERIAL',
    public readonly defaultTimeZone: string,
    public readonly fiscalYearStart: number,
    public readonly adminContact: OrganizationDTO['adminContact'],
    public readonly esgFrameworks: readonly string[] = [],
    public readonly status: LifecycleStatus = 'ACTIVE',
    public readonly createdAt?: string,
    public readonly updatedAt?: string
  ) {
    this.assertIdentity();
  }

  static fromMutation(orgId: string, dto: OrgConfigDTO): OrgConfigEntity {
    return new OrgConfigEntity(
      orgId,
      dto.name,
      dto.taxId,
      dto.hqAddress,
      dto.totalGlobalM2,
      dto.industrySector,
      dto.currency,
      dto.reportingCurrency,
      dto.minConfidence,
      dto.baselineYear,
      dto.reductionTarget,
      dto.targetYear,
      dto.subscriptionPlan,
      dto.name,
      undefined,
      undefined,
      'en',
      'METRIC',
      'UTC',
      1,
      { name: 'N/A', email: 'N/A', phone: 'N/A' },
      [],
      'ACTIVE',
      undefined,
      undefined
    );
  }

  static fromOrganizationDTO(dto: OrganizationDTO): OrgConfigEntity {
    return new OrgConfigEntity(
      dto.orgId,
      dto.name,
      dto.taxId,
      dto.hqAddress,
      dto.totalGlobalM2,
      dto.industrySector,
      dto.currency,
      dto.reportingCurrency,
      dto.minConfidence,
      dto.baselineYear,
      dto.reductionTarget,
      dto.targetYear,
      dto.subscriptionPlan,
      dto.legalName,
      dto.websiteUrl,
      dto.logoUrl,
      dto.primaryLanguage,
      dto.unitSystem,
      dto.defaultTimeZone,
      dto.fiscalYearStart,
      dto.adminContact,
      dto.esgFrameworks,
      dto.status,
      dto.createdAt,
      dto.updatedAt
    );
  }

  assertIdentity(): void {
    if (!this.orgId?.trim()) throw new SmsDomainError('OrgConfig.orgId required');
    if (!this.name?.trim()) throw new SmsDomainError('OrgConfig.name required');
    if (!this.legalName?.trim()) throw new SmsDomainError('OrgConfig.legalName required');
    if (!this.defaultTimeZone?.trim()) throw new SmsDomainError('OrgConfig.defaultTimeZone required');
    if (this.fiscalYearStart < 1 || this.fiscalYearStart > 12) {
      throw new SmsDomainError('OrgConfig.fiscalYearStart must be 1..12');
    }
    if (this.targetYear < this.baselineYear) {
      throw new SmsDomainError('OrgConfig.targetYear must be >= baselineYear');
    }
  }

  toValue(): OrgConfigDTO {
    return {
      name: this.name,
      taxId: this.taxId,
      hqAddress: this.hqAddress,
      totalGlobalM2: this.totalGlobalM2,
      industrySector: this.industrySector,
      currency: this.currency,
      reportingCurrency: this.reportingCurrency,
      minConfidence: this.minConfidence,
      baselineYear: this.baselineYear,
      reductionTarget: this.reductionTarget,
      targetYear: this.targetYear,
      subscriptionPlan: this.subscriptionPlan
    };
  }

  toOrganizationDTO(): OrganizationDTO {
    return {
      orgId: this.orgId,
      ...this.toValue(),
      legalName: this.legalName,
      ...(this.websiteUrl ? { websiteUrl: this.websiteUrl } : {}),
      ...(this.logoUrl ? { logoUrl: this.logoUrl } : {}),
      primaryLanguage: this.primaryLanguage,
      unitSystem: this.unitSystem,
      defaultTimeZone: this.defaultTimeZone,
      fiscalYearStart: this.fiscalYearStart,
      adminContact: this.adminContact,
      esgFrameworks: [...this.esgFrameworks],
      status: this.status,
      ...(this.createdAt !== undefined ? { createdAt: this.createdAt } : {}),
      ...(this.updatedAt !== undefined ? { updatedAt: this.updatedAt } : {})
    };
  }
}
