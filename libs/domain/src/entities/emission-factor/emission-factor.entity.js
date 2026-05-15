import { DomainInvariantError } from '../../exceptions/domain-invariant.error.js';
import { EmissionFactorDTO } from '@sms/common';
export class EmissionFactorEntity {
    id;
    name;
    year;
    regionCode;
    activityType;
    scope;
    calculationMethod;
    unit;
    value;
    co2Value;
    ch4Value;
    n2oValue;
    hfcValue;
    gwpReference;
    source;
    sourceUrl;
    dataQualityTier;
    uncertaintyPercentage;
    externalAuditDate;
    isProjection;
    decarbonizationTrend;
    biologicalCarbonStorage;
    status;
    tags;
    createdAt;
    updatedAt;
    constructor(id, name, year, regionCode, activityType, scope, calculationMethod, unit, value, co2Value, ch4Value, n2oValue, hfcValue, gwpReference, source, sourceUrl, dataQualityTier, uncertaintyPercentage, externalAuditDate, isProjection, decarbonizationTrend, biologicalCarbonStorage, status, tags, createdAt, updatedAt) {
        this.id = id;
        this.name = name;
        this.year = year;
        this.regionCode = regionCode;
        this.activityType = activityType;
        this.scope = scope;
        if (calculationMethod !== undefined)
            this.calculationMethod = calculationMethod;
        this.unit = unit;
        this.value = value;
        if (co2Value !== undefined)
            this.co2Value = co2Value;
        if (ch4Value !== undefined)
            this.ch4Value = ch4Value;
        if (n2oValue !== undefined)
            this.n2oValue = n2oValue;
        if (hfcValue !== undefined)
            this.hfcValue = hfcValue;
        this.gwpReference = gwpReference;
        this.source = source;
        if (sourceUrl !== undefined)
            this.sourceUrl = sourceUrl;
        this.dataQualityTier = dataQualityTier;
        this.uncertaintyPercentage = uncertaintyPercentage;
        if (externalAuditDate !== undefined)
            this.externalAuditDate = externalAuditDate;
        this.isProjection = isProjection;
        this.decarbonizationTrend = decarbonizationTrend;
        if (biologicalCarbonStorage !== undefined)
            this.biologicalCarbonStorage = biologicalCarbonStorage;
        this.status = status;
        this.tags = { ...tags };
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.assertIdentity();
        this.validateConsistency();
    }
    static fromDTO(dto) {
        return new EmissionFactorEntity(dto.id, dto.name, dto.year, dto.regionCode, dto.activityType, dto.scope, dto.calculationMethod, dto.unit, dto.value, dto.co2Value, dto.ch4Value, dto.n2oValue, dto.hfcValue, dto.gwpReference, dto.source, dto.sourceUrl, dto.dataQualityTier, dto.uncertaintyPercentage, dto.externalAuditDate, dto.isProjection, dto.decarbonizationTrend, dto.biologicalCarbonStorage, dto.status, dto.tags, dto.createdAt, dto.updatedAt);
    }
    assertIdentity() {
        if (!this.id?.trim())
            throw new DomainInvariantError('EmissionFactor.id required');
        if (!this.name?.trim())
            throw new DomainInvariantError('EmissionFactor.name required');
        if (!this.regionCode?.trim())
            throw new DomainInvariantError('EmissionFactor.regionCode required');
        if (!this.source?.trim())
            throw new DomainInvariantError('EmissionFactor.source required');
        if (!Number.isFinite(this.year))
            throw new DomainInvariantError('EmissionFactor.year invalid');
        if (this.value < 0 || !Number.isFinite(this.value)) {
            throw new DomainInvariantError('EmissionFactor.value invalid');
        }
        if (this.uncertaintyPercentage < 0 ||
            this.uncertaintyPercentage > 100 ||
            !Number.isFinite(this.uncertaintyPercentage)) {
            throw new DomainInvariantError('EmissionFactor.uncertaintyPercentage invalid');
        }
        if (!Number.isFinite(this.decarbonizationTrend)) {
            throw new DomainInvariantError('EmissionFactor.decarbonizationTrend invalid');
        }
    }
    validateConsistency() {
        if (this.scope === 2 && !this.calculationMethod) {
            throw new DomainInvariantError('EmissionFactor: Scope 2 requires calculation method (LOCATION_BASED or MARKET_BASED)');
        }
    }
    toValue() {
        return new EmissionFactorDTO(this.id, this.name, this.year, this.regionCode, this.activityType, this.scope, this.calculationMethod, this.unit, this.value, this.co2Value, this.ch4Value, this.n2oValue, this.hfcValue, this.gwpReference, this.source, this.sourceUrl, this.dataQualityTier, this.uncertaintyPercentage, this.externalAuditDate, this.isProjection, this.decarbonizationTrend, this.biologicalCarbonStorage, this.status, this.tags, this.createdAt, this.updatedAt);
    }
}
//# sourceMappingURL=emission-factor.entity.js.map