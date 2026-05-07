import { SmsDomainError } from '../shared/sms-domain-error.js';
import type { FacilityType, LifecycleStatus } from '../shared/graphql-setup-enums.js';
import type { AddressDTO } from '../shared/address.dto.js';
import type { BranchDTO } from './branch.dto.js';

/** Nivel 3 — sucursal / planta bajo una Region. */
export class BranchEntity {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly regionId: string,
    public readonly name: string,
    public readonly timezone: string,
    public readonly m2Surface: number,
    public readonly facilityType: FacilityType,
    public readonly status: LifecycleStatus,
    public readonly energyTarget?: number,
    public readonly isHeadquarters: boolean = false,
    public readonly address?: AddressDTO,
    public readonly createdAt?: string,
    public readonly updatedAt?: string
  ) {
    this.assertHierarchy();
  }

  static fromDTO(dto: BranchDTO): BranchEntity {
    return new BranchEntity(
      dto.id,
      dto.organizationId,
      dto.regionId,
      dto.name,
      dto.timezone,
      dto.m2Surface,
      dto.facilityType,
      dto.status,
      dto.energyTarget,
      dto.isHeadquarters,
      dto.address,
      dto.createdAt,
      dto.updatedAt
    );
  }

  assertBelongsToRegion(expectedRegionId: string): void {
    if (this.regionId !== expectedRegionId) {
      throw new SmsDomainError(
        `Branch ${this.id} region mismatch: expected ${expectedRegionId}, got ${this.regionId}`
      );
    }
  }

  assertHierarchy(): void {
    if (!this.id?.trim()) throw new SmsDomainError('Branch.id required');
    if (!this.organizationId?.trim()) throw new SmsDomainError('Branch.organizationId required');
    if (!this.regionId?.trim()) throw new SmsDomainError('Branch.regionId required');
    if (!this.name?.trim()) throw new SmsDomainError('Branch.name required');
    if (!this.timezone?.trim()) throw new SmsDomainError('Branch.timezone required');
    if (this.m2Surface < 0 || !Number.isFinite(this.m2Surface)) {
      throw new SmsDomainError('Branch.m2Surface invalid');
    }
  }

  toValue(): BranchDTO {
    return {
      id: this.id,
      organizationId: this.organizationId,
      regionId: this.regionId,
      name: this.name,
      timezone: this.timezone,
      m2Surface: this.m2Surface,
      facilityType: this.facilityType,
      status: this.status,
      isHeadquarters: this.isHeadquarters,
      ...(this.energyTarget !== undefined ? { energyTarget: this.energyTarget } : {}),
      ...(this.address !== undefined ? { address: this.address } : {}),
      ...(this.createdAt !== undefined ? { createdAt: this.createdAt } : {}),
      ...(this.updatedAt !== undefined ? { updatedAt: this.updatedAt } : {})
    };
  }
}
