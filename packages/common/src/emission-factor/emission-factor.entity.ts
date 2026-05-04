import { SmsDomainError } from '../shared/sms-domain-error.js';
import type { EmissionFactorDTO } from './emission-factor.dto.js';

export class EmissionFactorEntity {
  constructor(
    public readonly name: string,
    public readonly year: number,
    public readonly regionCode: string,
    public readonly activityType: EmissionFactorDTO['activityType'],
    public readonly unit: EmissionFactorDTO['unit'],
    public readonly value: number,
    public readonly scope: EmissionFactorDTO['scope']
  ) {
    this.assertIdentity();
  }

  static fromDTO(dto: EmissionFactorDTO): EmissionFactorEntity {
    return new EmissionFactorEntity(
      dto.name,
      dto.year,
      dto.regionCode,
      dto.activityType,
      dto.unit,
      dto.value,
      dto.scope
    );
  }

  assertIdentity(): void {
    if (!this.name?.trim()) throw new SmsDomainError('EmissionFactor.name required');
    if (!this.regionCode?.trim()) throw new SmsDomainError('EmissionFactor.regionCode required');
  }

  toValue(): EmissionFactorDTO {
    return {
      name: this.name,
      year: this.year,
      regionCode: this.regionCode,
      activityType: this.activityType,
      unit: this.unit,
      value: this.value,
      scope: this.scope
    };
  }
}
