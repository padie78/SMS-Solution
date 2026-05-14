import { DomainInvariantError } from '../../exceptions/domain-invariant.error.js';
import type { LifecycleStatus } from '@sms/common';
import type { OrgConfigDTO } from '@sms/common';
import { OrganizationDTO } from '@sms/common';

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
    if (!this.orgId?.trim()) throw new DomainInvariantError('OrgConfig.orgId required');
    if (!this.name?.trim()) throw new DomainInvariantError('OrgConfig.name required');
    if (!this.legalName?.trim()) throw new DomainInvariantError('OrgConfig.legalName required');
    if (!this.defaultTimeZone?.trim()) throw new DomainInvariantError('OrgConfig.defaultTimeZone required');
    if (this.fiscalYearStart < 1 || this.fiscalYearStart > 12) {
      throw new DomainInvariantError('OrgConfig.fiscalYearStart must be 1..12');
    }
    if (this.targetYear < this.baselineYear) {
      throw new DomainInvariantError('OrgConfig.targetYear must be >= baselineYear');
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
    const dto = new OrganizationDTO(
      this.orgId,
      this.name,
      this.legalName,
      this.taxId,
      this.industrySector,
      this.hqAddress,
      this.websiteUrl,
      this.logoUrl,
      this.primaryLanguage,
      this.unitSystem,
      this.currency,
      this.reportingCurrency,
      this.fiscalYearStart,
      this.totalGlobalM2,
      this.baselineYear,
      this.targetYear,
      this.reductionTarget,
      this.minConfidence,
      [...this.esgFrameworks],
      this.subscriptionPlan,
      this.status,
      this.adminContact,
      this.createdAt,
      this.updatedAt
    );
    (dto as { defaultTimeZone: string }).defaultTimeZone = this.defaultTimeZone;
    return dto;
  }
}
