import { DomainInvariantError } from '../../exceptions/domain-invariant.error.js';
import { OrganizationDTO } from '@sms/common';
export class OrgConfigEntity {
    orgId;
    name;
    taxId;
    hqAddress;
    totalGlobalM2;
    industrySector;
    currency;
    reportingCurrency;
    minConfidence;
    baselineYear;
    reductionTarget;
    targetYear;
    subscriptionPlan;
    legalName;
    websiteUrl;
    logoUrl;
    primaryLanguage;
    unitSystem;
    defaultTimeZone;
    fiscalYearStart;
    adminContact;
    esgFrameworks;
    status;
    createdAt;
    updatedAt;
    constructor(orgId, name, taxId, hqAddress, totalGlobalM2, industrySector, currency, reportingCurrency, minConfidence, baselineYear, reductionTarget, targetYear, subscriptionPlan, legalName, websiteUrl, logoUrl, primaryLanguage, unitSystem, defaultTimeZone, fiscalYearStart, adminContact, esgFrameworks = [], status = 'ACTIVE', createdAt, updatedAt) {
        this.orgId = orgId;
        this.name = name;
        this.taxId = taxId;
        this.hqAddress = hqAddress;
        this.totalGlobalM2 = totalGlobalM2;
        this.industrySector = industrySector;
        this.currency = currency;
        this.reportingCurrency = reportingCurrency;
        this.minConfidence = minConfidence;
        this.baselineYear = baselineYear;
        this.reductionTarget = reductionTarget;
        this.targetYear = targetYear;
        this.subscriptionPlan = subscriptionPlan;
        this.legalName = legalName;
        this.websiteUrl = websiteUrl;
        this.logoUrl = logoUrl;
        this.primaryLanguage = primaryLanguage;
        this.unitSystem = unitSystem;
        this.defaultTimeZone = defaultTimeZone;
        this.fiscalYearStart = fiscalYearStart;
        this.adminContact = adminContact;
        this.esgFrameworks = esgFrameworks;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.assertIdentity();
    }
    static fromMutation(orgId, dto) {
        return new OrgConfigEntity(orgId, dto.name, dto.taxId, dto.hqAddress, dto.totalGlobalM2, dto.industrySector, dto.currency, dto.reportingCurrency, dto.minConfidence, dto.baselineYear, dto.reductionTarget, dto.targetYear, dto.subscriptionPlan, dto.name, undefined, undefined, 'en', 'METRIC', 'UTC', 1, { name: 'N/A', email: 'N/A', phone: 'N/A' }, [], 'ACTIVE', undefined, undefined);
    }
    static fromOrganizationDTO(dto) {
        return new OrgConfigEntity(dto.orgId, dto.name, dto.taxId, dto.hqAddress, dto.totalGlobalM2, dto.industrySector, dto.currency, dto.reportingCurrency, dto.minConfidence, dto.baselineYear, dto.reductionTarget, dto.targetYear, dto.subscriptionPlan, dto.legalName, dto.websiteUrl, dto.logoUrl, dto.primaryLanguage, dto.unitSystem, dto.defaultTimeZone, dto.fiscalYearStart, dto.adminContact, dto.esgFrameworks, dto.status, dto.createdAt, dto.updatedAt);
    }
    assertIdentity() {
        if (!this.orgId?.trim())
            throw new DomainInvariantError('OrgConfig.orgId required');
        if (!this.name?.trim())
            throw new DomainInvariantError('OrgConfig.name required');
        if (!this.legalName?.trim())
            throw new DomainInvariantError('OrgConfig.legalName required');
        if (!this.defaultTimeZone?.trim())
            throw new DomainInvariantError('OrgConfig.defaultTimeZone required');
        if (this.fiscalYearStart < 1 || this.fiscalYearStart > 12) {
            throw new DomainInvariantError('OrgConfig.fiscalYearStart must be 1..12');
        }
        if (this.targetYear < this.baselineYear) {
            throw new DomainInvariantError('OrgConfig.targetYear must be >= baselineYear');
        }
    }
    toValue() {
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
    toOrganizationDTO() {
        const dto = new OrganizationDTO(this.orgId, this.name, this.legalName, this.taxId, this.industrySector, this.hqAddress, this.websiteUrl, this.logoUrl, this.primaryLanguage, this.unitSystem, this.currency, this.reportingCurrency, this.fiscalYearStart, this.totalGlobalM2, this.baselineYear, this.targetYear, this.reductionTarget, this.minConfidence, [...this.esgFrameworks], this.subscriptionPlan, this.status, this.adminContact, this.createdAt, this.updatedAt);
        dto.defaultTimeZone = this.defaultTimeZone;
        return dto;
    }
}
//# sourceMappingURL=org-config.entity.js.map