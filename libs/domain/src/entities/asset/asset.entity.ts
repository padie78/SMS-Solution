import { DomainInvariantError } from '../../exceptions/domain-invariant.error.js';
import type { AssetType } from '@sms/contracts';
import type { AssetLifecycleStatus } from '@sms/contracts';
import { AssetDTO } from '@sms/contracts';

/** Activo energético anclado a Building + CostCenter. */
export class AssetEntity {
  public readonly id: string;
  public readonly organizationId: string;
  public readonly regionId: string;
  public readonly branchId: string;
  public readonly buildingId: string;
  public readonly costCenterId: string;
  public readonly name: string;
  public readonly assetTag?: string;
  public readonly barcode?: string;
  public readonly type: AssetType;
  public readonly status: AssetLifecycleStatus;
  public readonly criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'MISSION_CRITICAL';
  public readonly manufacturer?: string;
  public readonly model?: string;
  public readonly serialNumber?: string;
  public readonly installationDate: string;
  public readonly usefulLifeYears: number;
  public readonly decommissionDate?: string;
  public readonly isSignificantEnergyUse: boolean;
  public readonly nominalPowerKw: number;
  public readonly standbyPowerKw?: number;
  public readonly energySource: 'ELECTRICITY' | 'NATURAL_GAS' | 'DIESEL' | 'BIOMASS' | 'STEAM' | 'HYDROGEN';
  public readonly nominalEfficiency: number;
  public readonly dutyCycleExpected: number;
  public readonly powerFactorTarget: number;
  public readonly ghgScope: 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3';
  public readonly emissionSourceCategory:
    | 'STATIONARY_COMBUSTION'
    | 'FUGITIVE_EMISSIONS'
    | 'PROCESS_EMISSIONS';
  public readonly fuelType?: string;
  public readonly biogenicFraction: number;
  public readonly refrigerantGasType?: string;
  public readonly refrigerantChargeKg?: number;
  public readonly refrigerantGWP?: number;
  public readonly annualLeakageRateExpected: number;
  public readonly meterId?: string;
  public readonly cloudDeviceId?: string;
  public readonly telemetryTopic?: string;
  public readonly isVirtualAsset: boolean;
  public readonly dataQualityScore: number;
  public readonly lastMaintenanceDate?: string;
  public readonly nextMaintenanceDate?: string;
  public readonly maintenanceVendor?: string;
  public readonly conditionIndex: 'NEW' | 'GOOD' | 'FAIR' | 'POOR';
  public readonly efficiencyDegradationFactor: number;
  public readonly redundancyLevel: 'N' | 'N+1' | '2N';
  public readonly mtbfHours?: number;
  public readonly tags: Record<string, string>;
  public readonly createdAt?: string;
  public readonly updatedAt?: string;

  constructor(
    id: string,
    organizationId: string,
    regionId: string,
    branchId: string,
    buildingId: string,
    costCenterId: string,
    name: string,
    assetTag: string | undefined,
    barcode: string | undefined,
    type: AssetType,
    status: AssetLifecycleStatus,
    criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'MISSION_CRITICAL',
    manufacturer: string | undefined,
    model: string | undefined,
    serialNumber: string | undefined,
    installationDate: string,
    usefulLifeYears: number,
    decommissionDate: string | undefined,
    isSignificantEnergyUse: boolean,
    nominalPowerKw: number,
    standbyPowerKw: number | undefined,
    energySource: 'ELECTRICITY' | 'NATURAL_GAS' | 'DIESEL' | 'BIOMASS' | 'STEAM' | 'HYDROGEN',
    nominalEfficiency: number,
    dutyCycleExpected: number,
    powerFactorTarget: number,
    ghgScope: 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3',
    emissionSourceCategory: 'STATIONARY_COMBUSTION' | 'FUGITIVE_EMISSIONS' | 'PROCESS_EMISSIONS',
    fuelType: string | undefined,
    biogenicFraction: number,
    refrigerantGasType: string | undefined,
    refrigerantChargeKg: number | undefined,
    refrigerantGWP: number | undefined,
    annualLeakageRateExpected: number,
    meterId: string | undefined,
    cloudDeviceId: string | undefined,
    telemetryTopic: string | undefined,
    isVirtualAsset: boolean,
    dataQualityScore: number,
    lastMaintenanceDate: string | undefined,
    nextMaintenanceDate: string | undefined,
    maintenanceVendor: string | undefined,
    conditionIndex: 'NEW' | 'GOOD' | 'FAIR' | 'POOR',
    efficiencyDegradationFactor: number,
    redundancyLevel: 'N' | 'N+1' | '2N',
    mtbfHours: number | undefined,
    tags: Record<string, string>,
    createdAt?: string,
    updatedAt?: string
  ) {
    this.id = id;
    this.organizationId = organizationId;
    this.regionId = regionId;
    this.branchId = branchId;
    this.buildingId = buildingId;
    this.costCenterId = costCenterId;
    this.name = name;
    if (assetTag !== undefined) this.assetTag = assetTag;
    if (barcode !== undefined) this.barcode = barcode;
    this.type = type;
    this.status = status;
    this.criticality = criticality;
    if (manufacturer !== undefined) this.manufacturer = manufacturer;
    if (model !== undefined) this.model = model;
    if (serialNumber !== undefined) this.serialNumber = serialNumber;
    this.installationDate = installationDate;
    this.usefulLifeYears = usefulLifeYears;
    if (decommissionDate !== undefined) this.decommissionDate = decommissionDate;
    this.isSignificantEnergyUse = isSignificantEnergyUse;
    this.nominalPowerKw = nominalPowerKw;
    if (standbyPowerKw !== undefined) this.standbyPowerKw = standbyPowerKw;
    this.energySource = energySource;
    this.nominalEfficiency = nominalEfficiency;
    this.dutyCycleExpected = dutyCycleExpected;
    this.powerFactorTarget = powerFactorTarget;
    this.ghgScope = ghgScope;
    this.emissionSourceCategory = emissionSourceCategory;
    if (fuelType !== undefined) this.fuelType = fuelType;
    this.biogenicFraction = biogenicFraction;
    if (refrigerantGasType !== undefined) this.refrigerantGasType = refrigerantGasType;
    if (refrigerantChargeKg !== undefined) this.refrigerantChargeKg = refrigerantChargeKg;
    if (refrigerantGWP !== undefined) this.refrigerantGWP = refrigerantGWP;
    this.annualLeakageRateExpected = annualLeakageRateExpected;
    if (meterId !== undefined) this.meterId = meterId;
    if (cloudDeviceId !== undefined) this.cloudDeviceId = cloudDeviceId;
    if (telemetryTopic !== undefined) this.telemetryTopic = telemetryTopic;
    this.isVirtualAsset = isVirtualAsset;
    this.dataQualityScore = dataQualityScore;
    if (lastMaintenanceDate !== undefined) this.lastMaintenanceDate = lastMaintenanceDate;
    if (nextMaintenanceDate !== undefined) this.nextMaintenanceDate = nextMaintenanceDate;
    if (maintenanceVendor !== undefined) this.maintenanceVendor = maintenanceVendor;
    this.conditionIndex = conditionIndex;
    this.efficiencyDegradationFactor = efficiencyDegradationFactor;
    this.redundancyLevel = redundancyLevel;
    if (mtbfHours !== undefined) this.mtbfHours = mtbfHours;
    this.tags = { ...tags };
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.assertHierarchy();
  }

  static fromDTO(dto: AssetDTO): AssetEntity {
    return new AssetEntity(
      dto.id,
      dto.organizationId,
      dto.regionId,
      dto.branchId,
      dto.buildingId,
      dto.costCenterId,
      dto.name,
      dto.assetTag,
      dto.barcode,
      dto.type,
      dto.status,
      dto.criticality,
      dto.manufacturer,
      dto.model,
      dto.serialNumber,
      dto.installationDate,
      dto.usefulLifeYears,
      dto.decommissionDate,
      dto.isSignificantEnergyUse,
      dto.nominalPowerKw,
      dto.standbyPowerKw,
      dto.energySource,
      dto.nominalEfficiency,
      dto.dutyCycleExpected,
      dto.powerFactorTarget,
      dto.ghgScope,
      dto.emissionSourceCategory,
      dto.fuelType,
      dto.biogenicFraction,
      dto.refrigerantGasType,
      dto.refrigerantChargeKg,
      dto.refrigerantGWP,
      dto.annualLeakageRateExpected,
      dto.meterId,
      dto.cloudDeviceId,
      dto.telemetryTopic,
      dto.isVirtualAsset,
      dto.dataQualityScore,
      dto.lastMaintenanceDate,
      dto.nextMaintenanceDate,
      dto.maintenanceVendor,
      dto.conditionIndex,
      dto.efficiencyDegradationFactor,
      dto.redundancyLevel,
      dto.mtbfHours,
      dto.tags,
      dto.createdAt,
      dto.updatedAt
    );
  }

  assertHierarchy(): void {
    if (!this.id?.trim()) throw new DomainInvariantError('Asset.id required');
    if (!this.organizationId?.trim()) throw new DomainInvariantError('Asset.organizationId required');
    if (!this.regionId?.trim()) throw new DomainInvariantError('Asset.regionId required');
    if (!this.branchId?.trim()) throw new DomainInvariantError('Asset.branchId required');
    if (!this.buildingId?.trim()) throw new DomainInvariantError('Asset.buildingId required');
    if (!this.costCenterId?.trim()) throw new DomainInvariantError('Asset.costCenterId required');
    if (!this.name?.trim()) throw new DomainInvariantError('Asset.name required');
    if (!this.installationDate?.trim()) throw new DomainInvariantError('Asset.installationDate required');
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
    if (!(dcy >= 0 && dcy <= 1)) throw new DomainInvariantError('Asset.dutyCycleExpected invalid');
  }

  assertUnderBuilding(expectedBuildingId: string): void {
    if (this.buildingId !== expectedBuildingId) {
      throw new DomainInvariantError(`Asset ${this.id} not under building ${expectedBuildingId}`);
    }
  }

  toValue(): AssetDTO {
    return new AssetDTO(
      this.id,
      this.organizationId,
      this.regionId,
      this.branchId,
      this.buildingId,
      this.costCenterId,
      this.name,
      this.assetTag,
      this.barcode,
      this.type,
      this.status,
      this.criticality,
      this.manufacturer,
      this.model,
      this.serialNumber,
      this.installationDate,
      this.usefulLifeYears,
      this.decommissionDate,
      this.isSignificantEnergyUse,
      this.nominalPowerKw,
      this.standbyPowerKw,
      this.energySource,
      this.nominalEfficiency,
      this.dutyCycleExpected,
      this.powerFactorTarget,
      this.ghgScope,
      this.emissionSourceCategory,
      this.fuelType,
      this.biogenicFraction,
      this.refrigerantGasType,
      this.refrigerantChargeKg,
      this.refrigerantGWP,
      this.annualLeakageRateExpected,
      this.meterId,
      this.cloudDeviceId,
      this.telemetryTopic,
      this.isVirtualAsset,
      this.dataQualityScore,
      this.lastMaintenanceDate,
      this.nextMaintenanceDate,
      this.maintenanceVendor,
      this.conditionIndex,
      this.efficiencyDegradationFactor,
      this.redundancyLevel,
      this.mtbfHours,
      this.tags,
      this.createdAt,
      this.updatedAt
    );
  }
}
