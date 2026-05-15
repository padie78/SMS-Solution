import { DomainInvariantError } from '../../exceptions/domain-invariant.error.js';
import { BranchDTO } from '@sms/common';
/** Nivel 3 — sucursal / planta bajo una Region. */
export class BranchEntity {
    id;
    organizationId;
    regionId;
    name;
    branchCode;
    status;
    branchType;
    isHeadquarters;
    constructionYear;
    renovationYear;
    operatingHours;
    tags;
    ownershipType;
    leaseExpirationDate;
    defaultTariffId;
    costCenterId;
    annualEnergyBudget;
    localCurrency;
    annualRevenueTarget;
    totalFloorAreaM2;
    employeeCount;
    fteEmployees;
    openingDaysPerYear;
    averageDailyVisitors;
    energyIntensityTarget;
    baseloadThreshold;
    peakPowerContracted;
    weatherStationId;
    backupPowerType;
    fuelTankCapacityLiters;
    criticalLoadKw;
    hasOnSiteRenewable;
    renewableCapacityKw;
    hasEvCharging;
    certifications;
    hasAirQualityMonitoring;
    coolingSetPoint;
    heatingSetPoint;
    branchManager;
    createdAt;
    updatedAt;
    timezone;
    constructor(id, organizationId, regionId, name, branchCode, status, branchType, isHeadquarters, constructionYear, renovationYear, operatingHours, tags, ownershipType, leaseExpirationDate, defaultTariffId, costCenterId, annualEnergyBudget, localCurrency, annualRevenueTarget, totalFloorAreaM2, employeeCount, fteEmployees, openingDaysPerYear, averageDailyVisitors, energyIntensityTarget, baseloadThreshold, peakPowerContracted, weatherStationId, backupPowerType, fuelTankCapacityLiters, criticalLoadKw, hasOnSiteRenewable, renewableCapacityKw, hasEvCharging, certifications, hasAirQualityMonitoring, coolingSetPoint, heatingSetPoint, branchManager, createdAt, updatedAt, 
    /** Legacy persistencia/UI */
    timezone) {
        this.id = id;
        this.organizationId = organizationId;
        this.regionId = regionId;
        this.name = name;
        this.branchCode = branchCode;
        this.status = status;
        this.branchType = branchType;
        this.isHeadquarters = isHeadquarters;
        this.constructionYear = constructionYear;
        this.renovationYear = renovationYear;
        this.operatingHours = operatingHours;
        this.tags = tags;
        this.ownershipType = ownershipType;
        this.leaseExpirationDate = leaseExpirationDate;
        this.defaultTariffId = defaultTariffId;
        this.costCenterId = costCenterId;
        this.annualEnergyBudget = annualEnergyBudget;
        this.localCurrency = localCurrency;
        this.annualRevenueTarget = annualRevenueTarget;
        this.totalFloorAreaM2 = totalFloorAreaM2;
        this.employeeCount = employeeCount;
        this.fteEmployees = fteEmployees;
        this.openingDaysPerYear = openingDaysPerYear;
        this.averageDailyVisitors = averageDailyVisitors;
        this.energyIntensityTarget = energyIntensityTarget;
        this.baseloadThreshold = baseloadThreshold;
        this.peakPowerContracted = peakPowerContracted;
        this.weatherStationId = weatherStationId;
        this.backupPowerType = backupPowerType;
        this.fuelTankCapacityLiters = fuelTankCapacityLiters;
        this.criticalLoadKw = criticalLoadKw;
        this.hasOnSiteRenewable = hasOnSiteRenewable;
        this.renewableCapacityKw = renewableCapacityKw;
        this.hasEvCharging = hasEvCharging;
        this.certifications = certifications;
        this.hasAirQualityMonitoring = hasAirQualityMonitoring;
        this.coolingSetPoint = coolingSetPoint;
        this.heatingSetPoint = heatingSetPoint;
        this.branchManager = branchManager;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.timezone = timezone;
        this.assertHierarchy();
    }
    static fromDTO(dto) {
        return new BranchEntity(dto.id, dto.organizationId, dto.regionId, dto.name, dto.branchCode, dto.status, dto.branchType, dto.isHeadquarters, dto.constructionYear, dto.renovationYear, dto.operatingHours, dto.tags, dto.ownershipType, dto.leaseExpirationDate, dto.defaultTariffId, dto.costCenterId, dto.annualEnergyBudget, dto.localCurrency, dto.annualRevenueTarget, dto.totalFloorAreaM2, dto.employeeCount, dto.fteEmployees, dto.openingDaysPerYear, dto.averageDailyVisitors, dto.energyIntensityTarget, dto.baseloadThreshold, dto.peakPowerContracted, dto.weatherStationId, dto.backupPowerType, dto.fuelTankCapacityLiters, dto.criticalLoadKw, dto.hasOnSiteRenewable, dto.renewableCapacityKw, dto.hasEvCharging, dto.certifications, dto.hasAirQualityMonitoring, dto.coolingSetPoint, dto.heatingSetPoint, dto.branchManager, dto.createdAt, dto.updatedAt, dto.timezone);
    }
    assertBelongsToRegion(expectedRegionId) {
        if (this.regionId !== expectedRegionId) {
            throw new DomainInvariantError(`Branch ${this.id} region mismatch: expected ${expectedRegionId}, got ${this.regionId}`);
        }
    }
    assertHierarchy() {
        if (!this.id?.trim())
            throw new DomainInvariantError('Branch.id required');
        if (!this.organizationId?.trim())
            throw new DomainInvariantError('Branch.organizationId required');
        if (!this.regionId?.trim())
            throw new DomainInvariantError('Branch.regionId required');
        if (!this.name?.trim())
            throw new DomainInvariantError('Branch.name required');
        if (!this.branchCode?.trim())
            throw new DomainInvariantError('Branch.branchCode required');
        if (!this.localCurrency?.trim())
            throw new DomainInvariantError('Branch.localCurrency required');
        if (this.totalFloorAreaM2 < 0 || !Number.isFinite(this.totalFloorAreaM2)) {
            throw new DomainInvariantError('Branch.totalFloorAreaM2 invalid');
        }
        if (!Number.isFinite(this.constructionYear))
            throw new DomainInvariantError('Branch.constructionYear invalid');
    }
    toValue() {
        return new BranchDTO(this.id, this.organizationId, this.regionId, this.name, this.branchCode, this.status, this.branchType, this.isHeadquarters, this.constructionYear, this.renovationYear, this.operatingHours, [...this.tags], this.ownershipType, this.leaseExpirationDate, this.defaultTariffId, this.costCenterId, this.annualEnergyBudget, this.localCurrency, this.annualRevenueTarget, this.totalFloorAreaM2, this.employeeCount, this.fteEmployees, this.openingDaysPerYear, this.averageDailyVisitors, this.energyIntensityTarget, this.baseloadThreshold, this.peakPowerContracted, this.weatherStationId, this.backupPowerType, this.fuelTankCapacityLiters, this.criticalLoadKw, this.hasOnSiteRenewable, this.renewableCapacityKw, this.hasEvCharging, [...this.certifications], this.hasAirQualityMonitoring, this.coolingSetPoint, this.heatingSetPoint, this.branchManager, this.createdAt, this.updatedAt, this.timezone);
    }
}
//# sourceMappingURL=branch.entity.js.map