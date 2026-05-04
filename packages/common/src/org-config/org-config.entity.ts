import { SmsDomainError } from '../shared/sms-domain-error.js';
import type { OrgConfigDTO } from './org-config.dto.js';

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
    public readonly subscriptionPlan: OrgConfigDTO['subscriptionPlan']
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
      dto.subscriptionPlan
    );
  }

  assertIdentity(): void {
    if (!this.orgId?.trim()) throw new SmsDomainError('OrgConfig.orgId required');
    if (!this.name?.trim()) throw new SmsDomainError('OrgConfig.name required');
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
}
