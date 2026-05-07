import { SmsDomainError } from '../shared/sms-domain-error.js';
import type { LifecycleStatus } from '../shared/graphql-setup-enums.js';
import type { GeoCoordinatesDTO } from '../shared/geo.dto.js';
import type { RegionDTO } from './region.dto.js';

/** Nivel 2 — agrupa sucursales geopolíticas / compliance. */
export class RegionEntity {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly name: string,
    public readonly code: string,
    public readonly countryCode: string,
    public readonly timezone: string,
    public readonly status: LifecycleStatus,
    public readonly description?: string,
    public readonly coordinates?: GeoCoordinatesDTO,
    public readonly createdAt?: string,
    public readonly updatedAt?: string
  ) {
    this.assertIdentity();
  }

  static fromDTO(dto: RegionDTO): RegionEntity {
    return new RegionEntity(
      dto.id,
      dto.organizationId,
      dto.name,
      dto.code,
      dto.countryCode,
      dto.timezone,
      dto.status,
      dto.description,
      dto.coordinates,
      dto.createdAt,
      dto.updatedAt
    );
  }

  assertIdentity(): void {
    if (!this.id?.trim()) throw new SmsDomainError('Region.id required');
    if (!this.organizationId?.trim()) throw new SmsDomainError('Region.organizationId required');
    if (!this.name?.trim()) throw new SmsDomainError('Region.name required');
    if (!this.code?.trim()) throw new SmsDomainError('Region.code required');
    if (!this.countryCode?.trim()) throw new SmsDomainError('Region.countryCode required');
    if (!this.timezone?.trim()) throw new SmsDomainError('Region.timezone required');
  }

  toValue(): RegionDTO {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      code: this.code,
      countryCode: this.countryCode,
      timezone: this.timezone,
      status: this.status,
      ...(this.description !== undefined ? { description: this.description } : {}),
      ...(this.coordinates !== undefined ? { coordinates: this.coordinates } : {}),
      ...(this.createdAt !== undefined ? { createdAt: this.createdAt } : {}),
      ...(this.updatedAt !== undefined ? { updatedAt: this.updatedAt } : {})
    };
  }
}
