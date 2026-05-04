import { SmsDomainError } from '../shared/sms-domain-error.js';
import type { FacilityType } from '../shared/graphql-setup-enums.js';
import type { BranchDTO } from './branch.dto.js';

/** Nivel 3 — sucursal / planta bajo una Region. */
export class BranchEntity {
  constructor(
    public readonly id: string,
    public readonly regionId: string,
    public readonly name: string,
    public readonly timezone?: string,
    public readonly m2Surface?: number,
    public readonly facilityType?: FacilityType,
    public readonly regionLabel?: string
  ) {
    this.assertHierarchy();
  }

  static fromDTO(dto: BranchDTO): BranchEntity {
    return new BranchEntity(
      dto.id,
      dto.regionId,
      dto.name,
      dto.timezone,
      dto.m2Surface,
      dto.facilityType,
      dto.regionLabel
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
    if (!this.regionId?.trim()) throw new SmsDomainError('Branch.regionId required');
    if (!this.name?.trim()) throw new SmsDomainError('Branch.name required');
  }

  toValue(): BranchDTO {
    return {
      id: this.id,
      regionId: this.regionId,
      name: this.name,
      timezone: this.timezone,
      m2Surface: this.m2Surface,
      facilityType: this.facilityType,
      regionLabel: this.regionLabel
    };
  }
}
