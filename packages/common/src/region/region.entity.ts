import { SmsDomainError } from '../shared/sms-domain-error.js';
import type { RegionDTO } from './region.dto.js';

/** Nivel 2 — agrupa sucursales geopolíticas / compliance. */
export class RegionEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly code?: string
  ) {
    this.assertIdentity();
  }

  static fromDTO(dto: RegionDTO): RegionEntity {
    return new RegionEntity(dto.id, dto.name, dto.code);
  }

  assertIdentity(): void {
    if (!this.id?.trim()) throw new SmsDomainError('Region.id required');
    if (!this.name?.trim()) throw new SmsDomainError('Region.name required');
  }

  toValue(): RegionDTO {
    return { id: this.id, name: this.name, code: this.code };
  }
}
