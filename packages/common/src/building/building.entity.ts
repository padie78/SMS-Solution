import { SmsDomainError } from '../shared/sms-domain-error.js';
import type { BuildingUsageType, HvacType, MainFuelType, OperationalStatus } from '../shared/graphql-setup-enums.js';
import type { GeoCoordinatesDTO } from '../shared/geo.dto.js';
import { BuildingDTO } from './building.dto.js';

/** Nivel 4 — activo físico bajo Branch. */
export class BuildingEntity {
  public readonly id: string;
  public readonly organizationId: string;
  public readonly regionId: string;
  public readonly branchId: string;
  public readonly name: string;
  public readonly status: OperationalStatus;
  public readonly usageTypeEnum: BuildingUsageType;
  public readonly m2Surface: number;
  public readonly m3Volume: number;
  public readonly footprintM2?: number;
  public readonly floorsCount: number;
  public readonly yearBuilt: number;
  public readonly renovationYear?: number;
  public readonly insulationQuality: 'POOR' | 'AVERAGE' | 'HIGH';
  public readonly windowWallRatio: number;
  public readonly roofType: 'GREEN' | 'REFLECTIVE' | 'STANDARD';
  public readonly coordinates: GeoCoordinatesDTO;
  public readonly hvacType: HvacType;
  public readonly hvacAgeYears?: number;
  public readonly hvacEfficiencyRating?: number;
  public readonly maintenanceStatus: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL';
  public readonly lastEnergyAuditDate?: string;
  public readonly mainFuelType: MainFuelType;
  public readonly lightingTechnology: 'LED' | 'FLUORESCENT' | 'HID' | 'MIXED';
  public readonly lightingPowerDensity?: number;
  public readonly hasBms: boolean;
  public readonly bmsVendor?: string;
  public readonly bmsProtocols: readonly string[];
  public readonly hasSmartMetering: boolean;
  public readonly dataGranularity: 'MANUAL' | 'MONTHLY' | 'DAILY' | 'TELEMETRY';
  public readonly submeteringTopology: 'CENTRALIZED' | 'BY_FLOOR' | 'BY_LOAD' | 'NONE';
  public readonly buildingCertifications: readonly string[];
  public readonly epcRating?: string;
  public readonly onsiteGenerationCapacityKw?: number;
  public readonly airQualitySensors: boolean;
  public readonly waterRecyclingSystem: boolean;
  public readonly evChargingPoints: number;
  public readonly createdAt?: string;
  public readonly updatedAt?: string;
  /** Legacy */
  public readonly usageType?: string;

  constructor(
    id: string,
    organizationId: string,
    regionId: string,
    branchId: string,
    name: string,
    status: OperationalStatus,
    usageTypeEnum: BuildingUsageType,
    m2Surface: number,
    m3Volume: number,
    footprintM2: number | undefined,
    floorsCount: number,
    yearBuilt: number,
    renovationYear: number | undefined,
    insulationQuality: 'POOR' | 'AVERAGE' | 'HIGH',
    windowWallRatio: number,
    roofType: 'GREEN' | 'REFLECTIVE' | 'STANDARD',
    coordinates: GeoCoordinatesDTO,
    hvacType: HvacType,
    hvacAgeYears: number | undefined,
    hvacEfficiencyRating: number | undefined,
    maintenanceStatus: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL',
    lastEnergyAuditDate: string | undefined,
    mainFuelType: MainFuelType,
    lightingTechnology: 'LED' | 'FLUORESCENT' | 'HID' | 'MIXED',
    lightingPowerDensity: number | undefined,
    hasBms: boolean,
    bmsVendor: string | undefined,
    bmsProtocols: readonly string[],
    hasSmartMetering: boolean,
    dataGranularity: 'MANUAL' | 'MONTHLY' | 'DAILY' | 'TELEMETRY',
    submeteringTopology: 'CENTRALIZED' | 'BY_FLOOR' | 'BY_LOAD' | 'NONE',
    buildingCertifications: readonly string[],
    epcRating: string | undefined,
    onsiteGenerationCapacityKw: number | undefined,
    airQualitySensors: boolean,
    waterRecyclingSystem: boolean,
    evChargingPoints: number,
    createdAt?: string,
    updatedAt?: string,
    usageType?: string
  ) {
    this.id = id;
    this.organizationId = organizationId;
    this.regionId = regionId;
    this.branchId = branchId;
    this.name = name;
    this.status = status;
    this.usageTypeEnum = usageTypeEnum;
    this.m2Surface = m2Surface;
    this.m3Volume = m3Volume;
    if (footprintM2 !== undefined) this.footprintM2 = footprintM2;
    this.floorsCount = floorsCount;
    this.yearBuilt = yearBuilt;
    if (renovationYear !== undefined) this.renovationYear = renovationYear;
    this.insulationQuality = insulationQuality;
    this.windowWallRatio = windowWallRatio;
    this.roofType = roofType;
    this.coordinates = coordinates;
    this.hvacType = hvacType;
    if (hvacAgeYears !== undefined) this.hvacAgeYears = hvacAgeYears;
    if (hvacEfficiencyRating !== undefined) this.hvacEfficiencyRating = hvacEfficiencyRating;
    this.maintenanceStatus = maintenanceStatus;
    if (lastEnergyAuditDate !== undefined) this.lastEnergyAuditDate = lastEnergyAuditDate;
    this.mainFuelType = mainFuelType;
    this.lightingTechnology = lightingTechnology;
    if (lightingPowerDensity !== undefined) this.lightingPowerDensity = lightingPowerDensity;
    this.hasBms = hasBms;
    if (bmsVendor !== undefined) this.bmsVendor = bmsVendor;
    this.bmsProtocols = bmsProtocols;
    this.hasSmartMetering = hasSmartMetering;
    this.dataGranularity = dataGranularity;
    this.submeteringTopology = submeteringTopology;
    this.buildingCertifications = buildingCertifications;
    if (epcRating !== undefined) this.epcRating = epcRating;
    if (onsiteGenerationCapacityKw !== undefined) this.onsiteGenerationCapacityKw = onsiteGenerationCapacityKw;
    this.airQualitySensors = airQualitySensors;
    this.waterRecyclingSystem = waterRecyclingSystem;
    this.evChargingPoints = evChargingPoints;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    if (usageType !== undefined) this.usageType = usageType;
    this.assertHierarchy();
  }

  static fromDTO(dto: BuildingDTO): BuildingEntity {
    return new BuildingEntity(
      dto.id,
      dto.organizationId,
      dto.regionId,
      dto.branchId,
      dto.name,
      dto.status,
      dto.usageTypeEnum,
      dto.m2Surface,
      dto.m3Volume,
      dto.footprintM2,
      dto.floorsCount,
      dto.yearBuilt,
      dto.renovationYear,
      dto.insulationQuality,
      dto.windowWallRatio,
      dto.roofType,
      dto.coordinates,
      dto.hvacType,
      dto.hvacAgeYears,
      dto.hvacEfficiencyRating,
      dto.maintenanceStatus,
      dto.lastEnergyAuditDate,
      dto.mainFuelType,
      dto.lightingTechnology,
      dto.lightingPowerDensity,
      dto.hasBms,
      dto.bmsVendor,
      dto.bmsProtocols,
      dto.hasSmartMetering,
      dto.dataGranularity,
      dto.submeteringTopology,
      dto.buildingCertifications,
      dto.epcRating,
      dto.onsiteGenerationCapacityKw,
      dto.airQualitySensors,
      dto.waterRecyclingSystem,
      dto.evChargingPoints,
      dto.createdAt,
      dto.updatedAt,
      dto.usageType
    );
  }

  assertBelongsToBranch(expectedBranchId: string): void {
    if (this.branchId !== expectedBranchId) {
      throw new SmsDomainError(
        `Building ${this.id} branch mismatch: expected ${expectedBranchId}, got ${this.branchId}`
      );
    }
  }

  assertHierarchy(): void {
    if (!this.id?.trim()) throw new SmsDomainError('Building.id required');
    if (!this.organizationId?.trim()) throw new SmsDomainError('Building.organizationId required');
    if (!this.regionId?.trim()) throw new SmsDomainError('Building.regionId required');
    if (!this.branchId?.trim()) throw new SmsDomainError('Building.branchId required');
    if (!this.name?.trim()) throw new SmsDomainError('Building.name required');
    if (this.m2Surface < 0 || !Number.isFinite(this.m2Surface)) {
      throw new SmsDomainError('Building.m2Surface invalid');
    }
    if (this.m3Volume < 0 || !Number.isFinite(this.m3Volume)) {
      throw new SmsDomainError('Building.m3Volume invalid');
    }
    if (this.windowWallRatio < 0 || this.windowWallRatio > 1) {
      throw new SmsDomainError('Building.windowWallRatio invalid');
    }
    if (!Number.isFinite(this.coordinates.lat) || !Number.isFinite(this.coordinates.lng)) {
      throw new SmsDomainError('Building.coordinates invalid');
    }
  }

  toValue(): BuildingDTO {
    return new BuildingDTO(
      this.id,
      this.organizationId,
      this.regionId,
      this.branchId,
      this.name,
      this.status,
      this.usageTypeEnum,
      this.m2Surface,
      this.m3Volume,
      this.footprintM2,
      this.floorsCount,
      this.yearBuilt,
      this.renovationYear,
      this.insulationQuality,
      this.windowWallRatio,
      this.roofType,
      this.coordinates,
      this.hvacType,
      this.hvacAgeYears,
      this.hvacEfficiencyRating,
      this.maintenanceStatus,
      this.lastEnergyAuditDate,
      this.mainFuelType,
      this.lightingTechnology,
      this.lightingPowerDensity,
      this.hasBms,
      this.bmsVendor,
      [...this.bmsProtocols],
      this.hasSmartMetering,
      this.dataGranularity,
      this.submeteringTopology,
      [...this.buildingCertifications],
      this.epcRating,
      this.onsiteGenerationCapacityKw,
      this.airQualitySensors,
      this.waterRecyclingSystem,
      this.evChargingPoints,
      this.createdAt,
      this.updatedAt,
      this.usageType
    );
  }
}
