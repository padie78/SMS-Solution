import { DomainInvariantError } from '../../exceptions/domain-invariant.error.js';
import { BuildingDTO } from '@sms/common';
/** Nivel 4 — activo físico bajo Branch. */
export class BuildingEntity {
    id;
    organizationId;
    regionId;
    branchId;
    name;
    status;
    usageTypeEnum;
    m2Surface;
    m3Volume;
    footprintM2;
    floorsCount;
    yearBuilt;
    renovationYear;
    insulationQuality;
    windowWallRatio;
    roofType;
    coordinates;
    hvacType;
    hvacAgeYears;
    hvacEfficiencyRating;
    maintenanceStatus;
    lastEnergyAuditDate;
    mainFuelType;
    lightingTechnology;
    lightingPowerDensity;
    hasBms;
    bmsVendor;
    bmsProtocols;
    hasSmartMetering;
    dataGranularity;
    submeteringTopology;
    buildingCertifications;
    epcRating;
    onsiteGenerationCapacityKw;
    airQualitySensors;
    waterRecyclingSystem;
    evChargingPoints;
    createdAt;
    updatedAt;
    /** Legacy */
    usageType;
    constructor(id, organizationId, regionId, branchId, name, status, usageTypeEnum, m2Surface, m3Volume, footprintM2, floorsCount, yearBuilt, renovationYear, insulationQuality, windowWallRatio, roofType, coordinates, hvacType, hvacAgeYears, hvacEfficiencyRating, maintenanceStatus, lastEnergyAuditDate, mainFuelType, lightingTechnology, lightingPowerDensity, hasBms, bmsVendor, bmsProtocols, hasSmartMetering, dataGranularity, submeteringTopology, buildingCertifications, epcRating, onsiteGenerationCapacityKw, airQualitySensors, waterRecyclingSystem, evChargingPoints, createdAt, updatedAt, usageType) {
        this.id = id;
        this.organizationId = organizationId;
        this.regionId = regionId;
        this.branchId = branchId;
        this.name = name;
        this.status = status;
        this.usageTypeEnum = usageTypeEnum;
        this.m2Surface = m2Surface;
        this.m3Volume = m3Volume;
        if (footprintM2 !== undefined)
            this.footprintM2 = footprintM2;
        this.floorsCount = floorsCount;
        this.yearBuilt = yearBuilt;
        if (renovationYear !== undefined)
            this.renovationYear = renovationYear;
        this.insulationQuality = insulationQuality;
        this.windowWallRatio = windowWallRatio;
        this.roofType = roofType;
        this.coordinates = coordinates;
        this.hvacType = hvacType;
        if (hvacAgeYears !== undefined)
            this.hvacAgeYears = hvacAgeYears;
        if (hvacEfficiencyRating !== undefined)
            this.hvacEfficiencyRating = hvacEfficiencyRating;
        this.maintenanceStatus = maintenanceStatus;
        if (lastEnergyAuditDate !== undefined)
            this.lastEnergyAuditDate = lastEnergyAuditDate;
        this.mainFuelType = mainFuelType;
        this.lightingTechnology = lightingTechnology;
        if (lightingPowerDensity !== undefined)
            this.lightingPowerDensity = lightingPowerDensity;
        this.hasBms = hasBms;
        if (bmsVendor !== undefined)
            this.bmsVendor = bmsVendor;
        this.bmsProtocols = bmsProtocols;
        this.hasSmartMetering = hasSmartMetering;
        this.dataGranularity = dataGranularity;
        this.submeteringTopology = submeteringTopology;
        this.buildingCertifications = buildingCertifications;
        if (epcRating !== undefined)
            this.epcRating = epcRating;
        if (onsiteGenerationCapacityKw !== undefined)
            this.onsiteGenerationCapacityKw = onsiteGenerationCapacityKw;
        this.airQualitySensors = airQualitySensors;
        this.waterRecyclingSystem = waterRecyclingSystem;
        this.evChargingPoints = evChargingPoints;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        if (usageType !== undefined)
            this.usageType = usageType;
        this.assertHierarchy();
    }
    static fromDTO(dto) {
        return new BuildingEntity(dto.id, dto.organizationId, dto.regionId, dto.branchId, dto.name, dto.status, dto.usageTypeEnum, dto.m2Surface, dto.m3Volume, dto.footprintM2, dto.floorsCount, dto.yearBuilt, dto.renovationYear, dto.insulationQuality, dto.windowWallRatio, dto.roofType, dto.coordinates, dto.hvacType, dto.hvacAgeYears, dto.hvacEfficiencyRating, dto.maintenanceStatus, dto.lastEnergyAuditDate, dto.mainFuelType, dto.lightingTechnology, dto.lightingPowerDensity, dto.hasBms, dto.bmsVendor, dto.bmsProtocols, dto.hasSmartMetering, dto.dataGranularity, dto.submeteringTopology, dto.buildingCertifications, dto.epcRating, dto.onsiteGenerationCapacityKw, dto.airQualitySensors, dto.waterRecyclingSystem, dto.evChargingPoints, dto.createdAt, dto.updatedAt, dto.usageType);
    }
    assertBelongsToBranch(expectedBranchId) {
        if (this.branchId !== expectedBranchId) {
            throw new DomainInvariantError(`Building ${this.id} branch mismatch: expected ${expectedBranchId}, got ${this.branchId}`);
        }
    }
    assertHierarchy() {
        if (!this.id?.trim())
            throw new DomainInvariantError('Building.id required');
        if (!this.organizationId?.trim())
            throw new DomainInvariantError('Building.organizationId required');
        if (!this.regionId?.trim())
            throw new DomainInvariantError('Building.regionId required');
        if (!this.branchId?.trim())
            throw new DomainInvariantError('Building.branchId required');
        if (!this.name?.trim())
            throw new DomainInvariantError('Building.name required');
        if (this.m2Surface < 0 || !Number.isFinite(this.m2Surface)) {
            throw new DomainInvariantError('Building.m2Surface invalid');
        }
        if (this.m3Volume < 0 || !Number.isFinite(this.m3Volume)) {
            throw new DomainInvariantError('Building.m3Volume invalid');
        }
        if (this.windowWallRatio < 0 || this.windowWallRatio > 1) {
            throw new DomainInvariantError('Building.windowWallRatio invalid');
        }
        if (!Number.isFinite(this.coordinates.lat) || !Number.isFinite(this.coordinates.lng)) {
            throw new DomainInvariantError('Building.coordinates invalid');
        }
    }
    toValue() {
        return new BuildingDTO(this.id, this.organizationId, this.regionId, this.branchId, this.name, this.status, this.usageTypeEnum, this.m2Surface, this.m3Volume, this.footprintM2, this.floorsCount, this.yearBuilt, this.renovationYear, this.insulationQuality, this.windowWallRatio, this.roofType, this.coordinates, this.hvacType, this.hvacAgeYears, this.hvacEfficiencyRating, this.maintenanceStatus, this.lastEnergyAuditDate, this.mainFuelType, this.lightingTechnology, this.lightingPowerDensity, this.hasBms, this.bmsVendor, [...this.bmsProtocols], this.hasSmartMetering, this.dataGranularity, this.submeteringTopology, [...this.buildingCertifications], this.epcRating, this.onsiteGenerationCapacityKw, this.airQualitySensors, this.waterRecyclingSystem, this.evChargingPoints, this.createdAt, this.updatedAt, this.usageType);
    }
}
//# sourceMappingURL=building.entity.js.map