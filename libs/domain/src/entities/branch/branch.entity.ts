import { DomainInvariantError } from '../../exceptions/domain-invariant.error.js';
import { BranchDTO } from '@sms/contracts';

/** Nivel 3 — sucursal / planta bajo una Region. */
export class BranchEntity {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly regionId: string,
    public readonly name: string,
    public readonly branchCode: string,
    public readonly status: BranchDTO['status'],
    public readonly branchType: BranchDTO['branchType'],
    public readonly isHeadquarters: boolean,
    public readonly constructionYear: number,
    public readonly renovationYear: number | undefined,
    public readonly operatingHours: BranchDTO['operatingHours'],
    public readonly tags: readonly string[],
    public readonly ownershipType: BranchDTO['ownershipType'],
    public readonly leaseExpirationDate: string | undefined,
    public readonly defaultTariffId: string | undefined,
    public readonly costCenterId: string | undefined,
    public readonly annualEnergyBudget: number | undefined,
    public readonly localCurrency: string,
    public readonly annualRevenueTarget: number | undefined,
    public readonly totalFloorAreaM2: number,
    public readonly employeeCount: number,
    public readonly fteEmployees: number,
    public readonly openingDaysPerYear: number,
    public readonly averageDailyVisitors: number | undefined,
    public readonly energyIntensityTarget: number,
    public readonly baseloadThreshold: number,
    public readonly peakPowerContracted: number,
    public readonly weatherStationId: string | undefined,
    public readonly backupPowerType: BranchDTO['backupPowerType'],
    public readonly fuelTankCapacityLiters: number | undefined,
    public readonly criticalLoadKw: number | undefined,
    public readonly hasOnSiteRenewable: boolean,
    public readonly renewableCapacityKw: number | undefined,
    public readonly hasEvCharging: boolean,
    public readonly certifications: readonly string[],
    public readonly hasAirQualityMonitoring: boolean,
    public readonly coolingSetPoint: number,
    public readonly heatingSetPoint: number,
    public readonly branchManager: BranchDTO['branchManager'],
    public readonly createdAt?: string,
    public readonly updatedAt?: string,
    /** Legacy persistencia/UI */
    public readonly timezone?: string
  ) {
    this.assertHierarchy();
  }

  static fromDTO(dto: BranchDTO): BranchEntity {
    return new BranchEntity(
      dto.id,
      dto.organizationId,
      dto.regionId,
      dto.name,
      dto.branchCode,
      dto.status,
      dto.branchType,
      dto.isHeadquarters,
      dto.constructionYear,
      dto.renovationYear,
      dto.operatingHours,
      dto.tags,
      dto.ownershipType,
      dto.leaseExpirationDate,
      dto.defaultTariffId,
      dto.costCenterId,
      dto.annualEnergyBudget,
      dto.localCurrency,
      dto.annualRevenueTarget,
      dto.totalFloorAreaM2,
      dto.employeeCount,
      dto.fteEmployees,
      dto.openingDaysPerYear,
      dto.averageDailyVisitors,
      dto.energyIntensityTarget,
      dto.baseloadThreshold,
      dto.peakPowerContracted,
      dto.weatherStationId,
      dto.backupPowerType,
      dto.fuelTankCapacityLiters,
      dto.criticalLoadKw,
      dto.hasOnSiteRenewable,
      dto.renewableCapacityKw,
      dto.hasEvCharging,
      dto.certifications,
      dto.hasAirQualityMonitoring,
      dto.coolingSetPoint,
      dto.heatingSetPoint,
      dto.branchManager,
      dto.createdAt,
      dto.updatedAt,
      dto.timezone
    );
  }

  assertBelongsToRegion(expectedRegionId: string): void {
    if (this.regionId !== expectedRegionId) {
      throw new DomainInvariantError(
        `Branch ${this.id} region mismatch: expected ${expectedRegionId}, got ${this.regionId}`
      );
    }
  }

  assertHierarchy(): void {
    if (!this.id?.trim()) throw new DomainInvariantError('Branch.id required');
    if (!this.organizationId?.trim()) throw new DomainInvariantError('Branch.organizationId required');
    if (!this.regionId?.trim()) throw new DomainInvariantError('Branch.regionId required');
    if (!this.name?.trim()) throw new DomainInvariantError('Branch.name required');
    if (!this.branchCode?.trim()) throw new DomainInvariantError('Branch.branchCode required');
    if (!this.localCurrency?.trim()) throw new DomainInvariantError('Branch.localCurrency required');
    if (this.totalFloorAreaM2 < 0 || !Number.isFinite(this.totalFloorAreaM2)) {
      throw new DomainInvariantError('Branch.totalFloorAreaM2 invalid');
    }
    if (!Number.isFinite(this.constructionYear)) throw new DomainInvariantError('Branch.constructionYear invalid');
  }

  toValue(): BranchDTO {
    return new BranchDTO(
      this.id,
      this.organizationId,
      this.regionId,
      this.name,
      this.branchCode,
      this.status,
      this.branchType,
      this.isHeadquarters,
      this.constructionYear,
      this.renovationYear,
      this.operatingHours,
      [...this.tags],
      this.ownershipType,
      this.leaseExpirationDate,
      this.defaultTariffId,
      this.costCenterId,
      this.annualEnergyBudget,
      this.localCurrency,
      this.annualRevenueTarget,
      this.totalFloorAreaM2,
      this.employeeCount,
      this.fteEmployees,
      this.openingDaysPerYear,
      this.averageDailyVisitors,
      this.energyIntensityTarget,
      this.baseloadThreshold,
      this.peakPowerContracted,
      this.weatherStationId,
      this.backupPowerType,
      this.fuelTankCapacityLiters,
      this.criticalLoadKw,
      this.hasOnSiteRenewable,
      this.renewableCapacityKw,
      this.hasEvCharging,
      [...this.certifications],
      this.hasAirQualityMonitoring,
      this.coolingSetPoint,
      this.heatingSetPoint,
      this.branchManager,
      this.createdAt,
      this.updatedAt,
      this.timezone
    );
  }
}
