import { SmsDomainError } from '../shared/sms-domain-error.js';
import type { BuildingUsageType, HvacType, MainFuelType, OperationalStatus } from '../shared/graphql-setup-enums.js';
import type { GeoCoordinatesDTO } from '../shared/geo.dto.js';
import type { BuildingDTO } from './building.dto.js';

/** Nivel 4 — activo físico bajo Branch. */
export class BuildingEntity {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly regionId: string,
    public readonly branchId: string,
    public readonly name: string,
    public readonly usageTypeEnum: BuildingUsageType,
    public readonly m2Surface: number,
    public readonly hvacType: HvacType,
    public readonly hasBms: boolean,
    public readonly status: OperationalStatus,
    public readonly usageType?: string,
    public readonly m3Volume?: number,
    public readonly yearBuilt?: number,
    public readonly bmsVendor?: string,
    public readonly mainFuelType?: MainFuelType,
    public readonly coordinates?: GeoCoordinatesDTO,
    public readonly createdAt?: string,
    public readonly updatedAt?: string
  ) {
    this.assertHierarchy();
  }

  static fromDTO(dto: BuildingDTO): BuildingEntity {
    return new BuildingEntity(
      dto.id,
      dto.organizationId,
      dto.regionId,
      dto.branchId,
      dto.name,
      dto.usageTypeEnum,
      dto.m2Surface,
      dto.hvacType,
      dto.hasBms,
      dto.status,
      dto.usageType,
      dto.m3Volume,
      dto.yearBuilt,
      dto.bmsVendor,
      dto.mainFuelType,
      dto.coordinates,
      dto.createdAt,
      dto.updatedAt
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
  }

  toValue(): BuildingDTO {
    return {
      id: this.id,
      organizationId: this.organizationId,
      regionId: this.regionId,
      branchId: this.branchId,
      name: this.name,
      usageTypeEnum: this.usageTypeEnum,
      m2Surface: this.m2Surface,
      hvacType: this.hvacType,
      hasBms: this.hasBms,
      status: this.status,
      ...(this.usageType !== undefined ? { usageType: this.usageType } : {}),
      ...(this.m3Volume !== undefined ? { m3Volume: this.m3Volume } : {}),
      ...(this.yearBuilt !== undefined ? { yearBuilt: this.yearBuilt } : {}),
      ...(this.bmsVendor !== undefined ? { bmsVendor: this.bmsVendor } : {}),
      ...(this.mainFuelType !== undefined ? { mainFuelType: this.mainFuelType } : {}),
      ...(this.coordinates !== undefined ? { coordinates: this.coordinates } : {}),
      ...(this.createdAt !== undefined ? { createdAt: this.createdAt } : {}),
      ...(this.updatedAt !== undefined ? { updatedAt: this.updatedAt } : {})
    };
  }
}
