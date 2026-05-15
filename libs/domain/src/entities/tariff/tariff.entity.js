import { DomainInvariantError } from '../../exceptions/domain-invariant.error.js';
import { TariffDTO } from '@sms/common';
/** Contrato tarifario con benchmarking, demanda y capa ESG. */
export class TariffEntity {
    id;
    orgId;
    branchId;
    buildingId;
    providerName;
    contractId;
    serviceType;
    pricingModel;
    currency;
    baseRate;
    expectedAverageRate;
    demandChargeRate;
    demandChargeUnit;
    fixedMonthlyFee;
    taxPercentage;
    touScheduleId;
    peakRate;
    valleyRate;
    shoulderRate;
    season;
    tieredRates;
    fuelAdjustmentFactor;
    indexReferenceId;
    indexAdjustmentFormula;
    volatilityIndex;
    reactiveEnergyCharge;
    powerFactorThreshold;
    greenPremium;
    carbonTaxRate;
    efficiencyRebateRate;
    validFrom;
    validTo;
    billingCycleDay;
    status;
    tags;
    createdAt;
    updatedAt;
    constructor(id, orgId, branchId, buildingId, providerName, contractId, serviceType, pricingModel, currency, baseRate, expectedAverageRate, demandChargeRate, demandChargeUnit, fixedMonthlyFee, taxPercentage, touScheduleId, peakRate, valleyRate, shoulderRate, season, tieredRates, fuelAdjustmentFactor, indexReferenceId, indexAdjustmentFormula, volatilityIndex, reactiveEnergyCharge, powerFactorThreshold, greenPremium, carbonTaxRate, efficiencyRebateRate, validFrom, validTo, billingCycleDay, status, tags, createdAt, updatedAt) {
        this.id = id;
        this.orgId = orgId;
        this.branchId = branchId;
        if (buildingId !== undefined)
            this.buildingId = buildingId;
        this.providerName = providerName;
        this.contractId = contractId;
        this.serviceType = serviceType;
        this.pricingModel = pricingModel;
        this.currency = currency;
        this.baseRate = baseRate;
        if (expectedAverageRate !== undefined)
            this.expectedAverageRate = expectedAverageRate;
        if (demandChargeRate !== undefined)
            this.demandChargeRate = demandChargeRate;
        this.demandChargeUnit = demandChargeUnit;
        if (fixedMonthlyFee !== undefined)
            this.fixedMonthlyFee = fixedMonthlyFee;
        this.taxPercentage = taxPercentage;
        if (touScheduleId !== undefined)
            this.touScheduleId = touScheduleId;
        if (peakRate !== undefined)
            this.peakRate = peakRate;
        if (valleyRate !== undefined)
            this.valleyRate = valleyRate;
        if (shoulderRate !== undefined)
            this.shoulderRate = shoulderRate;
        this.season = season;
        if (tieredRates !== undefined && tieredRates.length > 0)
            this.tieredRates = tieredRates.map((t) => ({ ...t }));
        this.fuelAdjustmentFactor = fuelAdjustmentFactor;
        if (indexReferenceId !== undefined)
            this.indexReferenceId = indexReferenceId;
        if (indexAdjustmentFormula !== undefined)
            this.indexAdjustmentFormula = indexAdjustmentFormula;
        this.volatilityIndex = volatilityIndex;
        if (reactiveEnergyCharge !== undefined)
            this.reactiveEnergyCharge = reactiveEnergyCharge;
        this.powerFactorThreshold = powerFactorThreshold;
        this.greenPremium = greenPremium;
        if (carbonTaxRate !== undefined)
            this.carbonTaxRate = carbonTaxRate;
        if (efficiencyRebateRate !== undefined)
            this.efficiencyRebateRate = efficiencyRebateRate;
        this.validFrom = validFrom;
        this.validTo = validTo;
        this.billingCycleDay = billingCycleDay;
        this.status = status;
        this.tags = { ...tags };
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.assertIdentity();
    }
    static fromDTO(dto) {
        return new TariffEntity(dto.id, dto.orgId, dto.branchId, dto.buildingId, dto.providerName, dto.contractId, dto.serviceType, dto.pricingModel, dto.currency, dto.baseRate, dto.expectedAverageRate, dto.demandChargeRate, dto.demandChargeUnit, dto.fixedMonthlyFee, dto.taxPercentage, dto.touScheduleId, dto.peakRate, dto.valleyRate, dto.shoulderRate, dto.season, dto.tieredRates, dto.fuelAdjustmentFactor, dto.indexReferenceId, dto.indexAdjustmentFormula, dto.volatilityIndex, dto.reactiveEnergyCharge, dto.powerFactorThreshold, dto.greenPremium, dto.carbonTaxRate, dto.efficiencyRebateRate, dto.validFrom, dto.validTo, dto.billingCycleDay, dto.status, dto.tags, dto.createdAt, dto.updatedAt);
    }
    assertIdentity() {
        if (!this.id?.trim())
            throw new DomainInvariantError('Tariff.id required');
        if (!this.orgId?.trim())
            throw new DomainInvariantError('Tariff.orgId required');
        if (!this.branchId?.trim())
            throw new DomainInvariantError('Tariff.branchId required');
        if (!this.providerName?.trim())
            throw new DomainInvariantError('Tariff.providerName required');
        if (!this.contractId?.trim())
            throw new DomainInvariantError('Tariff.contractId required');
        if (this.baseRate < 0 || !Number.isFinite(this.baseRate)) {
            throw new DomainInvariantError('Tariff.baseRate invalid');
        }
        if (this.taxPercentage < 0 || this.taxPercentage > 1 || !Number.isFinite(this.taxPercentage)) {
            throw new DomainInvariantError('Tariff.taxPercentage invalid');
        }
        if (this.volatilityIndex < 0 ||
            this.volatilityIndex > 1 ||
            !Number.isFinite(this.volatilityIndex)) {
            throw new DomainInvariantError('Tariff.volatilityIndex invalid');
        }
        if (this.powerFactorThreshold < 0 ||
            this.powerFactorThreshold > 1 ||
            !Number.isFinite(this.powerFactorThreshold)) {
            throw new DomainInvariantError('Tariff.powerFactorThreshold invalid');
        }
        if (this.greenPremium < 0 || !Number.isFinite(this.greenPremium)) {
            throw new DomainInvariantError('Tariff.greenPremium invalid');
        }
        if (this.billingCycleDay < 1 || this.billingCycleDay > 31) {
            throw new DomainInvariantError('Tariff.billingCycleDay invalid');
        }
        if (!(this.fuelAdjustmentFactor > 0) || !Number.isFinite(this.fuelAdjustmentFactor)) {
            throw new DomainInvariantError('Tariff.fuelAdjustmentFactor invalid');
        }
        if (this.validTo < this.validFrom) {
            throw new DomainInvariantError('Tariff.validTo must be >= validFrom');
        }
        if (Array.isArray(this.tieredRates) &&
            this.tieredRates.some((t) => !(t.rate >= 0) || !(t.limit >= 0) || !Number.isFinite(t.rate) || !Number.isFinite(t.limit))) {
            throw new DomainInvariantError('Tariff.tieredRates invalid');
        }
    }
    toValue() {
        return new TariffDTO(this.id, this.orgId, this.branchId, this.buildingId, this.serviceType, this.providerName, this.contractId, this.pricingModel, this.currency, this.baseRate, this.expectedAverageRate, this.demandChargeRate, this.demandChargeUnit, this.fixedMonthlyFee, this.taxPercentage, this.touScheduleId, this.peakRate, this.valleyRate, this.shoulderRate, this.season, this.tieredRates, this.fuelAdjustmentFactor, this.indexReferenceId, this.indexAdjustmentFormula, this.volatilityIndex, this.reactiveEnergyCharge, this.powerFactorThreshold, this.greenPremium, this.carbonTaxRate, this.efficiencyRebateRate, this.validFrom, this.validTo, this.billingCycleDay, this.status, this.tags, this.createdAt, this.updatedAt);
    }
}
//# sourceMappingURL=tariff.entity.js.map