import { DomainInvariantError } from '../../exceptions/domain-invariant.error.js';
import { MeterDTO } from '@sms/common';
/** Punto de medición: siempre Building; opcionalmente Asset para sub-medición. */
export class MeterEntity {
    id;
    orgId;
    regionId;
    branchId;
    buildingId;
    name;
    serialNumber;
    internalTag;
    meterType;
    serviceType;
    unit;
    accuracyClass;
    multiplier;
    loggingIntervalMinutes;
    timeZone;
    isMain;
    isNetMetering;
    meterLevel;
    parentMeterId;
    assetId;
    status;
    communicationStatus;
    lastCalibrationDate;
    nextCalibrationDate;
    monitorsPowerQuality;
    hasDataLogging;
    metrologicalSealNumber;
    protocol;
    physicalAddress;
    firmwareVersion;
    isVirtual;
    virtualFormula;
    tags;
    createdAt;
    updatedAt;
    constructor(id, orgId, regionId, branchId, buildingId, name, serialNumber, internalTag, meterType, serviceType, unit, accuracyClass, multiplier, loggingIntervalMinutes, timeZone, isMain, isNetMetering, meterLevel, parentMeterId, assetId, status, communicationStatus, lastCalibrationDate, nextCalibrationDate, monitorsPowerQuality, hasDataLogging, metrologicalSealNumber, protocol, physicalAddress, firmwareVersion, isVirtual, virtualFormula, tags, createdAt, updatedAt) {
        this.id = id;
        this.orgId = orgId;
        this.regionId = regionId;
        this.branchId = branchId;
        this.buildingId = buildingId;
        this.name = name;
        this.serialNumber = serialNumber;
        if (internalTag !== undefined)
            this.internalTag = internalTag;
        this.meterType = meterType;
        this.serviceType = serviceType;
        this.unit = unit;
        this.accuracyClass = accuracyClass;
        this.multiplier = multiplier;
        this.loggingIntervalMinutes = loggingIntervalMinutes;
        this.timeZone = timeZone;
        this.isMain = isMain;
        this.isNetMetering = isNetMetering;
        this.meterLevel = meterLevel;
        if (parentMeterId !== undefined)
            this.parentMeterId = parentMeterId;
        if (assetId !== undefined)
            this.assetId = assetId;
        this.status = status;
        this.communicationStatus = communicationStatus;
        if (lastCalibrationDate !== undefined)
            this.lastCalibrationDate = lastCalibrationDate;
        if (nextCalibrationDate !== undefined)
            this.nextCalibrationDate = nextCalibrationDate;
        this.monitorsPowerQuality = monitorsPowerQuality;
        this.hasDataLogging = hasDataLogging;
        if (metrologicalSealNumber !== undefined)
            this.metrologicalSealNumber = metrologicalSealNumber;
        this.protocol = protocol;
        if (physicalAddress !== undefined)
            this.physicalAddress = physicalAddress;
        if (firmwareVersion !== undefined)
            this.firmwareVersion = firmwareVersion;
        this.isVirtual = isVirtual;
        if (virtualFormula !== undefined)
            this.virtualFormula = virtualFormula;
        this.tags = { ...tags };
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.validateHierarchy();
    }
    static fromDTO(dto) {
        return new MeterEntity(dto.id, dto.orgId, dto.regionId, dto.branchId, dto.buildingId, dto.name, dto.serialNumber, dto.internalTag, dto.meterType, dto.serviceType, dto.unit, dto.accuracyClass, dto.multiplier, dto.loggingIntervalMinutes, dto.timeZone, dto.isMain, dto.isNetMetering, dto.meterLevel, dto.parentMeterId, dto.assetId, dto.status, dto.communicationStatus, dto.lastCalibrationDate, dto.nextCalibrationDate, dto.monitorsPowerQuality, dto.hasDataLogging, dto.metrologicalSealNumber, dto.protocol, dto.physicalAddress, dto.firmwareVersion, dto.isVirtual, dto.virtualFormula, dto.tags, dto.createdAt, dto.updatedAt);
    }
    validateHierarchy() {
        if (!this.id?.trim())
            throw new DomainInvariantError('Meter.id required');
        if (!this.orgId?.trim())
            throw new DomainInvariantError('Meter.orgId required');
        if (!this.regionId?.trim())
            throw new DomainInvariantError('Meter.regionId required');
        if (!this.branchId?.trim())
            throw new DomainInvariantError('Meter.branchId required');
        if (!this.buildingId?.trim()) {
            throw new DomainInvariantError('Meter cannot exist without buildingId (localization tree)');
        }
        if (!this.serialNumber?.trim())
            throw new DomainInvariantError('Meter.serialNumber required');
        if (!this.name?.trim())
            throw new DomainInvariantError('Meter.name required');
        if (this.isMain && this.meterLevel !== 1) {
            throw new DomainInvariantError('Main meters must be at level 1');
        }
        if (this.multiplier <= 0 || !Number.isFinite(this.multiplier)) {
            throw new DomainInvariantError('Meter.multiplier invalid');
        }
        if (!Number.isInteger(this.loggingIntervalMinutes) ||
            this.loggingIntervalMinutes < 1) {
            throw new DomainInvariantError('Meter.loggingIntervalMinutes invalid');
        }
    }
    isSubMeter() {
        return Boolean(this.assetId?.trim());
    }
    assertAssetAlignedWithBuilding(assetBuildingId) {
        if (!this.assetId)
            return;
        if (this.buildingId !== assetBuildingId) {
            throw new DomainInvariantError(`Meter ${this.id}: asset-linked meter must reference same building as asset (${assetBuildingId})`);
        }
    }
    toValue() {
        return new MeterDTO(this.id, this.orgId, this.regionId, this.branchId, this.buildingId, this.name, this.serialNumber, this.internalTag, this.meterType, this.serviceType, this.unit, this.accuracyClass, this.multiplier, this.loggingIntervalMinutes, this.timeZone, this.isMain, this.isNetMetering, this.meterLevel, this.parentMeterId, this.assetId, this.status, this.communicationStatus, this.lastCalibrationDate, this.nextCalibrationDate, this.monitorsPowerQuality, this.hasDataLogging, this.metrologicalSealNumber, this.protocol, this.physicalAddress, this.firmwareVersion, this.isVirtual, this.virtualFormula, this.tags, this.createdAt, this.updatedAt);
    }
}
//# sourceMappingURL=meter.entity.js.map