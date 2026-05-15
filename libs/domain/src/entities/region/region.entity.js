import { DomainInvariantError } from '../../exceptions/domain-invariant.error.js';
import { RegionDTO } from '@sms/common';
/** Nivel 2 — agrupa sucursales geopolíticas / compliance. */
export class RegionEntity {
    id;
    organizationId;
    name;
    code;
    countryCode;
    timezone;
    coordinates;
    climateZone;
    avgHDD;
    avgCDD;
    totalRegionalM2;
    totalHeadcount;
    annualRevenueTarget;
    gridEmissionFactor;
    carbonTaxRate;
    carbonMarketType;
    marginalAbatementCost;
    renewableEnergyAvailability;
    gridRenewableShare;
    waterStressIndex;
    localRegulations;
    maturityLevel;
    economicArea;
    regionalManager;
    regionalReductionTarget;
    energyScarcityRisk;
    status;
    description;
    createdAt;
    updatedAt;
    constructor(id, organizationId, name, code, countryCode, timezone, coordinates, climateZone, avgHDD, avgCDD, totalRegionalM2, totalHeadcount, annualRevenueTarget, gridEmissionFactor, carbonTaxRate, carbonMarketType, marginalAbatementCost, renewableEnergyAvailability, gridRenewableShare, waterStressIndex, localRegulations, maturityLevel, economicArea, regionalManager, regionalReductionTarget, energyScarcityRisk, status, description, createdAt, updatedAt) {
        this.id = id;
        this.organizationId = organizationId;
        this.name = name;
        this.code = code;
        this.countryCode = countryCode;
        this.timezone = timezone;
        this.coordinates = coordinates;
        this.climateZone = climateZone;
        this.avgHDD = avgHDD;
        this.avgCDD = avgCDD;
        this.totalRegionalM2 = totalRegionalM2;
        this.totalHeadcount = totalHeadcount;
        this.annualRevenueTarget = annualRevenueTarget;
        this.gridEmissionFactor = gridEmissionFactor;
        this.carbonTaxRate = carbonTaxRate;
        this.carbonMarketType = carbonMarketType;
        this.marginalAbatementCost = marginalAbatementCost;
        this.renewableEnergyAvailability = renewableEnergyAvailability;
        this.gridRenewableShare = gridRenewableShare;
        this.waterStressIndex = waterStressIndex;
        this.localRegulations = localRegulations;
        this.maturityLevel = maturityLevel;
        this.economicArea = economicArea;
        this.regionalManager = regionalManager;
        this.regionalReductionTarget = regionalReductionTarget;
        this.energyScarcityRisk = energyScarcityRisk;
        this.status = status;
        this.description = description;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.assertIdentity();
    }
    static fromDTO(dto) {
        return new RegionEntity(dto.id, dto.organizationId, dto.name, dto.code, dto.countryCode, dto.timezone, dto.coordinates, dto.climateZone, dto.avgHDD, dto.avgCDD, dto.totalRegionalM2, dto.totalHeadcount, dto.annualRevenueTarget, dto.gridEmissionFactor, dto.carbonTaxRate, dto.carbonMarketType, dto.marginalAbatementCost, dto.renewableEnergyAvailability, dto.gridRenewableShare, dto.waterStressIndex, dto.localRegulations, dto.maturityLevel, dto.economicArea, dto.regionalManager, dto.regionalReductionTarget, dto.energyScarcityRisk, dto.status, dto.description, dto.createdAt, dto.updatedAt);
    }
    assertIdentity() {
        if (!this.id?.trim())
            throw new DomainInvariantError('Region.id required');
        if (!this.organizationId?.trim())
            throw new DomainInvariantError('Region.organizationId required');
        if (!this.name?.trim())
            throw new DomainInvariantError('Region.name required');
        if (!this.code?.trim())
            throw new DomainInvariantError('Region.code required');
        if (!this.countryCode?.trim())
            throw new DomainInvariantError('Region.countryCode required');
        if (!this.timezone?.trim())
            throw new DomainInvariantError('Region.timezone required');
    }
    toValue() {
        return new RegionDTO(this.id, this.organizationId, this.name, this.code, this.countryCode, this.timezone, this.coordinates, this.climateZone, this.avgHDD, this.avgCDD, this.totalRegionalM2, this.totalHeadcount, this.annualRevenueTarget, this.gridEmissionFactor, this.carbonTaxRate, this.carbonMarketType, this.marginalAbatementCost, this.renewableEnergyAvailability, this.gridRenewableShare, this.waterStressIndex, [...this.localRegulations], this.maturityLevel, this.economicArea, this.regionalManager, this.regionalReductionTarget, this.energyScarcityRisk, this.status, this.createdAt, this.updatedAt, this.description);
    }
}
//# sourceMappingURL=region.entity.js.map