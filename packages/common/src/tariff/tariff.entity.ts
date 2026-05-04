import { SmsDomainError } from '../shared/sms-domain-error.js';
import type { EnergyServiceType } from '../shared/graphql-setup-enums.js';
import type { TariffDTO } from './tariff.dto.js';

export class TariffEntity {
  constructor(
    public readonly orgId: string,
    public readonly branchId: string,
    public readonly serviceType: EnergyServiceType,
    public readonly providerName: string,
    public readonly contractId: string,
    public readonly pricingModel: TariffDTO['pricingModel'],
    public readonly baseRate: number,
    public readonly validFrom: string,
    public readonly validTo: string
  ) {
    this.assertIdentity();
  }

  static fromMutation(
    orgId: string,
    branchId: string,
    serviceType: EnergyServiceType,
    dto: TariffDTO
  ): TariffEntity {
    return new TariffEntity(
      orgId,
      branchId,
      serviceType,
      dto.providerName,
      dto.contractId,
      dto.pricingModel,
      dto.baseRate,
      dto.validFrom,
      dto.validTo
    );
  }

  assertIdentity(): void {
    if (!this.orgId?.trim()) throw new SmsDomainError('Tariff.orgId required');
    if (!this.branchId?.trim()) throw new SmsDomainError('Tariff.branchId required');
    if (this.validTo < this.validFrom) {
      throw new SmsDomainError('Tariff.validTo must be >= validFrom');
    }
  }

  toValue(): TariffDTO {
    return {
      providerName: this.providerName,
      contractId: this.contractId,
      pricingModel: this.pricingModel,
      baseRate: this.baseRate,
      validFrom: this.validFrom,
      validTo: this.validTo
    };
  }
}
