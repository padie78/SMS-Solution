import { SmsDomainError } from '../shared/sms-domain-error.js';
import type { MeterType } from '../shared/domain-enums.js';
import type { MeterOperationalStatus, MeterProtocol } from '../shared/graphql-setup-enums.js';
import { MeterDTO } from './meter.dto.js';

/** Punto de medición: siempre Building; opcionalmente Asset para sub-medición. */
export class MeterEntity {
  public readonly id: string;
  public readonly orgId: string;
  public readonly regionId: string;
  public readonly branchId: string;
  public readonly buildingId: string;
  public readonly name: string;
  public readonly serialNumber: string;
  public readonly internalTag?: string;
  public readonly meterType: MeterType;
  public readonly serviceType: 'UTILITY' | 'SUBMETERING' | 'GENERATION';
  public readonly unit: 'KWH' | 'M3' | 'GJ' | 'L' | 'BTU';
  public readonly accuracyClass: '0.2S' | '0.5S' | '1.0' | '2.0';
  public readonly multiplier: number;
  public readonly loggingIntervalMinutes: number;
  public readonly timeZone: string;
  public readonly isMain: boolean;
  public readonly isNetMetering: boolean;
  public readonly meterLevel: number;
  public readonly parentMeterId?: string;
  public readonly assetId?: string;
  public readonly status: MeterOperationalStatus;
  public readonly communicationStatus: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  public readonly lastCalibrationDate?: string;
  public readonly nextCalibrationDate?: string;
  public readonly monitorsPowerQuality: boolean;
  public readonly hasDataLogging: boolean;
  public readonly metrologicalSealNumber?: string;
  public readonly protocol: MeterProtocol;
  public readonly physicalAddress?: string;
  public readonly firmwareVersion?: string;
  public readonly isVirtual: boolean;
  public readonly virtualFormula?: string;
  public readonly tags: Record<string, string>;
  public readonly createdAt?: string;
  public readonly updatedAt?: string;

  constructor(
    id: string,
    orgId: string,
    regionId: string,
    branchId: string,
    buildingId: string,
    name: string,
    serialNumber: string,
    internalTag: string | undefined,
    meterType: MeterType,
    serviceType: 'UTILITY' | 'SUBMETERING' | 'GENERATION',
    unit: 'KWH' | 'M3' | 'GJ' | 'L' | 'BTU',
    accuracyClass: '0.2S' | '0.5S' | '1.0' | '2.0',
    multiplier: number,
    loggingIntervalMinutes: number,
    timeZone: string,
    isMain: boolean,
    isNetMetering: boolean,
    meterLevel: number,
    parentMeterId: string | undefined,
    assetId: string | undefined,
    status: MeterOperationalStatus,
    communicationStatus: 'ONLINE' | 'OFFLINE' | 'DEGRADED',
    lastCalibrationDate: string | undefined,
    nextCalibrationDate: string | undefined,
    monitorsPowerQuality: boolean,
    hasDataLogging: boolean,
    metrologicalSealNumber: string | undefined,
    protocol: MeterProtocol,
    physicalAddress: string | undefined,
    firmwareVersion: string | undefined,
    isVirtual: boolean,
    virtualFormula: string | undefined,
    tags: Record<string, string>,
    createdAt?: string,
    updatedAt?: string
  ) {
    this.id = id;
    this.orgId = orgId;
    this.regionId = regionId;
    this.branchId = branchId;
    this.buildingId = buildingId;
    this.name = name;
    this.serialNumber = serialNumber;
    if (internalTag !== undefined) this.internalTag = internalTag;
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
    if (parentMeterId !== undefined) this.parentMeterId = parentMeterId;
    if (assetId !== undefined) this.assetId = assetId;
    this.status = status;
    this.communicationStatus = communicationStatus;
    if (lastCalibrationDate !== undefined) this.lastCalibrationDate = lastCalibrationDate;
    if (nextCalibrationDate !== undefined) this.nextCalibrationDate = nextCalibrationDate;
    this.monitorsPowerQuality = monitorsPowerQuality;
    this.hasDataLogging = hasDataLogging;
    if (metrologicalSealNumber !== undefined) this.metrologicalSealNumber = metrologicalSealNumber;
    this.protocol = protocol;
    if (physicalAddress !== undefined) this.physicalAddress = physicalAddress;
    if (firmwareVersion !== undefined) this.firmwareVersion = firmwareVersion;
    this.isVirtual = isVirtual;
    if (virtualFormula !== undefined) this.virtualFormula = virtualFormula;
    this.tags = { ...tags };
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.validateHierarchy();
  }

  static fromDTO(dto: MeterDTO): MeterEntity {
    return new MeterEntity(
      dto.id,
      dto.orgId,
      dto.regionId,
      dto.branchId,
      dto.buildingId,
      dto.name,
      dto.serialNumber,
      dto.internalTag,
      dto.meterType,
      dto.serviceType,
      dto.unit,
      dto.accuracyClass,
      dto.multiplier,
      dto.loggingIntervalMinutes,
      dto.timeZone,
      dto.isMain,
      dto.isNetMetering,
      dto.meterLevel,
      dto.parentMeterId,
      dto.assetId,
      dto.status,
      dto.communicationStatus,
      dto.lastCalibrationDate,
      dto.nextCalibrationDate,
      dto.monitorsPowerQuality,
      dto.hasDataLogging,
      dto.metrologicalSealNumber,
      dto.protocol,
      dto.physicalAddress,
      dto.firmwareVersion,
      dto.isVirtual,
      dto.virtualFormula,
      dto.tags,
      dto.createdAt,
      dto.updatedAt
    );
  }

  private validateHierarchy(): void {
    if (!this.id?.trim()) throw new SmsDomainError('Meter.id required');
    if (!this.orgId?.trim()) throw new SmsDomainError('Meter.orgId required');
    if (!this.regionId?.trim()) throw new SmsDomainError('Meter.regionId required');
    if (!this.branchId?.trim()) throw new SmsDomainError('Meter.branchId required');
    if (!this.buildingId?.trim()) {
      throw new SmsDomainError('Meter cannot exist without buildingId (localization tree)');
    }
    if (!this.serialNumber?.trim()) throw new SmsDomainError('Meter.serialNumber required');
    if (!this.name?.trim()) throw new SmsDomainError('Meter.name required');
    if (this.isMain && this.meterLevel !== 1) {
      throw new SmsDomainError('Main meters must be at level 1');
    }
    if (this.multiplier <= 0 || !Number.isFinite(this.multiplier)) {
      throw new SmsDomainError('Meter.multiplier invalid');
    }
    if (
      !Number.isInteger(this.loggingIntervalMinutes) ||
      this.loggingIntervalMinutes < 1
    ) {
      throw new SmsDomainError('Meter.loggingIntervalMinutes invalid');
    }
  }

  isSubMeter(): boolean {
    return Boolean(this.assetId?.trim());
  }

  assertAssetAlignedWithBuilding(assetBuildingId: string): void {
    if (!this.assetId) return;
    if (this.buildingId !== assetBuildingId) {
      throw new SmsDomainError(
        `Meter ${this.id}: asset-linked meter must reference same building as asset (${assetBuildingId})`
      );
    }
  }

  toValue(): MeterDTO {
    return new MeterDTO(
      this.id,
      this.orgId,
      this.regionId,
      this.branchId,
      this.buildingId,
      this.name,
      this.serialNumber,
      this.internalTag,
      this.meterType,
      this.serviceType,
      this.unit,
      this.accuracyClass,
      this.multiplier,
      this.loggingIntervalMinutes,
      this.timeZone,
      this.isMain,
      this.isNetMetering,
      this.meterLevel,
      this.parentMeterId,
      this.assetId,
      this.status,
      this.communicationStatus,
      this.lastCalibrationDate,
      this.nextCalibrationDate,
      this.monitorsPowerQuality,
      this.hasDataLogging,
      this.metrologicalSealNumber,
      this.protocol,
      this.physicalAddress,
      this.firmwareVersion,
      this.isVirtual,
      this.virtualFormula,
      this.tags,
      this.createdAt,
      this.updatedAt
    );
  }
}
