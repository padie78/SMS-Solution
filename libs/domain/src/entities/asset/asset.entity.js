import { DomainInvariantError } from '../../exceptions/domain-invariant.error.js';
import { AssetDTO } from '@sms/common';
/** Activo energético anclado a Building + CostCenter. */
export class AssetEntity {
    id;
    organizationId;
    regionId;
    branchId;
    buildingId;
    costCenterId;
    name;
    assetTag;
    barcode;
    type;
    status;
    criticality;
    manufacturer;
    model;
    serialNumber;
    installationDate;
    usefulLifeYears;
    decommissionDate;
    isSignificantEnergyUse;
    nominalPowerKw;
    standbyPowerKw;
    energySource;
    nominalEfficiency;
    dutyCycleExpected;
    powerFactorTarget;
    ghgScope;
    emissionSourceCategory;
    fuelType;
    biogenicFraction;
    refrigerantGasType;
    refrigerantChargeKg;
    refrigerantGWP;
    annualLeakageRateExpected;
    meterId;
    cloudDeviceId;
    telemetryTopic;
    isVirtualAsset;
    dataQualityScore;
    lastMaintenanceDate;
    nextMaintenanceDate;
    maintenanceVendor;
    conditionIndex;
    efficiencyDegradationFactor;
    redundancyLevel;
    mtbfHours;
    tags;
    createdAt;
    updatedAt;
    constructor(id, organizationId, regionId, branchId, buildingId, costCenterId, name, assetTag, barcode, type, status, criticality, manufacturer, model, serialNumber, installationDate, usefulLifeYears, decommissionDate, isSignificantEnergyUse, nominalPowerKw, standbyPowerKw, energySource, nominalEfficiency, dutyCycleExpected, powerFactorTarget, ghgScope, emissionSourceCategory, fuelType, biogenicFraction, refrigerantGasType, refrigerantChargeKg, refrigerantGWP, annualLeakageRateExpected, meterId, cloudDeviceId, telemetryTopic, isVirtualAsset, dataQualityScore, lastMaintenanceDate, nextMaintenanceDate, maintenanceVendor, conditionIndex, efficiencyDegradationFactor, redundancyLevel, mtbfHours, tags, createdAt, updatedAt) {
        this.id = id;
        this.organizationId = organizationId;
        this.regionId = regionId;
        this.branchId = branchId;
        this.buildingId = buildingId;
        this.costCenterId = costCenterId;
        this.name = name;
        if (assetTag !== undefined)
            this.assetTag = assetTag;
        if (barcode !== undefined)
            this.barcode = barcode;
        this.type = type;
        this.status = status;
        this.criticality = criticality;
        if (manufacturer !== undefined)
            this.manufacturer = manufacturer;
        if (model !== undefined)
            this.model = model;
        if (serialNumber !== undefined)
            this.serialNumber = serialNumber;
        this.installationDate = installationDate;
        this.usefulLifeYears = usefulLifeYears;
        if (decommissionDate !== undefined)
            this.decommissionDate = decommissionDate;
        this.isSignificantEnergyUse = isSignificantEnergyUse;
        this.nominalPowerKw = nominalPowerKw;
        if (standbyPowerKw !== undefined)
            this.standbyPowerKw = standbyPowerKw;
        this.energySource = energySource;
        this.nominalEfficiency = nominalEfficiency;
        this.dutyCycleExpected = dutyCycleExpected;
        this.powerFactorTarget = powerFactorTarget;
        this.ghgScope = ghgScope;
        this.emissionSourceCategory = emissionSourceCategory;
        if (fuelType !== undefined)
            this.fuelType = fuelType;
        this.biogenicFraction = biogenicFraction;
        if (refrigerantGasType !== undefined)
            this.refrigerantGasType = refrigerantGasType;
        if (refrigerantChargeKg !== undefined)
            this.refrigerantChargeKg = refrigerantChargeKg;
        if (refrigerantGWP !== undefined)
            this.refrigerantGWP = refrigerantGWP;
        this.annualLeakageRateExpected = annualLeakageRateExpected;
        if (meterId !== undefined)
            this.meterId = meterId;
        if (cloudDeviceId !== undefined)
            this.cloudDeviceId = cloudDeviceId;
        if (telemetryTopic !== undefined)
            this.telemetryTopic = telemetryTopic;
        this.isVirtualAsset = isVirtualAsset;
        this.dataQualityScore = dataQualityScore;
        if (lastMaintenanceDate !== undefined)
            this.lastMaintenanceDate = lastMaintenanceDate;
        if (nextMaintenanceDate !== undefined)
            this.nextMaintenanceDate = nextMaintenanceDate;
        if (maintenanceVendor !== undefined)
            this.maintenanceVendor = maintenanceVendor;
        this.conditionIndex = conditionIndex;
        this.efficiencyDegradationFactor = efficiencyDegradationFactor;
        this.redundancyLevel = redundancyLevel;
        if (mtbfHours !== undefined)
            this.mtbfHours = mtbfHours;
        this.tags = { ...tags };
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.assertHierarchy();
    }
    static fromDTO(dto) {
        return new AssetEntity(dto.id, dto.organizationId, dto.regionId, dto.branchId, dto.buildingId, dto.costCenterId, dto.name, dto.assetTag, dto.barcode, dto.type, dto.status, dto.criticality, dto.manufacturer, dto.model, dto.serialNumber, dto.installationDate, dto.usefulLifeYears, dto.decommissionDate, dto.isSignificantEnergyUse, dto.nominalPowerKw, dto.standbyPowerKw, dto.energySource, dto.nominalEfficiency, dto.dutyCycleExpected, dto.powerFactorTarget, dto.ghgScope, dto.emissionSourceCategory, dto.fuelType, dto.biogenicFraction, dto.refrigerantGasType, dto.refrigerantChargeKg, dto.refrigerantGWP, dto.annualLeakageRateExpected, dto.meterId, dto.cloudDeviceId, dto.telemetryTopic, dto.isVirtualAsset, dto.dataQualityScore, dto.lastMaintenanceDate, dto.nextMaintenanceDate, dto.maintenanceVendor, dto.conditionIndex, dto.efficiencyDegradationFactor, dto.redundancyLevel, dto.mtbfHours, dto.tags, dto.createdAt, dto.updatedAt);
    }
    assertHierarchy() {
        if (!this.id?.trim())
            throw new DomainInvariantError('Asset.id required');
        if (!this.organizationId?.trim())
            throw new DomainInvariantError('Asset.organizationId required');
        if (!this.regionId?.trim())
            throw new DomainInvariantError('Asset.regionId required');
        if (!this.branchId?.trim())
            throw new DomainInvariantError('Asset.branchId required');
        if (!this.buildingId?.trim())
            throw new DomainInvariantError('Asset.buildingId required');
        if (!this.costCenterId?.trim())
            throw new DomainInvariantError('Asset.costCenterId required');
        if (!this.name?.trim())
            throw new DomainInvariantError('Asset.name required');
        if (!this.installationDate?.trim())
            throw new DomainInvariantError('Asset.installationDate required');
        if (!Number.isFinite(this.nominalPowerKw) || this.nominalPowerKw < 0) {
            throw new DomainInvariantError('Asset.nominalPowerKw invalid');
        }
        if (this.powerFactorTarget < 0 || this.powerFactorTarget > 1) {
            throw new DomainInvariantError('Asset.powerFactorTarget invalid');
        }
        if (this.biogenicFraction < 0 || this.biogenicFraction > 1) {
            throw new DomainInvariantError('Asset.biogenicFraction invalid');
        }
        if (this.dataQualityScore < 0 || this.dataQualityScore > 1) {
            throw new DomainInvariantError('Asset.dataQualityScore invalid');
        }
        if (!Number.isFinite(this.nominalEfficiency) || this.nominalEfficiency < 0) {
            throw new DomainInvariantError('Asset.nominalEfficiency invalid');
        }
        const dcy = this.dutyCycleExpected;
        if (!(dcy >= 0 && dcy <= 1))
            throw new DomainInvariantError('Asset.dutyCycleExpected invalid');
    }
    assertUnderBuilding(expectedBuildingId) {
        if (this.buildingId !== expectedBuildingId) {
            throw new DomainInvariantError(`Asset ${this.id} not under building ${expectedBuildingId}`);
        }
    }
    toValue() {
        return new AssetDTO(this.id, this.organizationId, this.regionId, this.branchId, this.buildingId, this.costCenterId, this.name, this.assetTag, this.barcode, this.type, this.status, this.criticality, this.manufacturer, this.model, this.serialNumber, this.installationDate, this.usefulLifeYears, this.decommissionDate, this.isSignificantEnergyUse, this.nominalPowerKw, this.standbyPowerKw, this.energySource, this.nominalEfficiency, this.dutyCycleExpected, this.powerFactorTarget, this.ghgScope, this.emissionSourceCategory, this.fuelType, this.biogenicFraction, this.refrigerantGasType, this.refrigerantChargeKg, this.refrigerantGWP, this.annualLeakageRateExpected, this.meterId, this.cloudDeviceId, this.telemetryTopic, this.isVirtualAsset, this.dataQualityScore, this.lastMaintenanceDate, this.nextMaintenanceDate, this.maintenanceVendor, this.conditionIndex, this.efficiencyDegradationFactor, this.redundancyLevel, this.mtbfHours, this.tags, this.createdAt, this.updatedAt);
    }
}
//# sourceMappingURL=asset.entity.js.map