import { SmsDomainError } from '../shared/sms-domain-error.js';
import type { BuildingUsageType, HvacType, OperationalStatus } from '../shared/graphql-setup-enums.js';
import type { BuildingDTO } from './building.dto.js';

/** Nivel 4 — activo físico bajo Branch. */
export class BuildingEntity {
  constructor(
    public readonly id: string,
    public readonly branchId: string,
    public readonly name: string,
    public readonly usageType?: string,
    public readonly usageTypeEnum?: BuildingUsageType,
    public readonly status?: OperationalStatus,
    public readonly yearBuilt?: number,
    public readonly m2Surface?: number,
    public readonly m3Volume?: number,
    public readonly hvacType?: HvacType,
    public readonly hasBms?: boolean
  ) {
    this.assertHierarchy();
  }

  static fromDTO(dto: BuildingDTO): BuildingEntity {
    return new BuildingEntity(
      dto.id,
      dto.branchId,
      dto.name,
      dto.usageType,
      dto.usageTypeEnum,
      dto.status,
      dto.yearBuilt,
      dto.m2Surface,
      dto.m3Volume,
      dto.hvacType,
      dto.hasBms
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
    if (!this.branchId?.trim()) throw new SmsDomainError('Building.branchId required');
    if (!this.name?.trim()) throw new SmsDomainError('Building.name required');
  }

  toValue(): BuildingDTO {
    return {
      id: this.id,
      branchId: this.branchId,
      name: this.name,
      usageType: this.usageType,
      usageTypeEnum: this.usageTypeEnum,
      status: this.status,
      yearBuilt: this.yearBuilt,
      m2Surface: this.m2Surface,
      m3Volume: this.m3Volume,
      hvacType: this.hvacType,
      hasBms: this.hasBms
    };
  }
}
