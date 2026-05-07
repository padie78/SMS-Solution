import { SmsDomainError } from '../shared/sms-domain-error.js';
import type { EnergyServiceType } from '../shared/graphql-setup-enums.js';
import type { TariffDTO } from './tariff.dto.js';

function generateTariffId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  return typeof c?.randomUUID === 'function'
    ? c.randomUUID()
    : `trf_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export class TariffEntity {
  constructor(
    public readonly id: string,
    public readonly orgId: string,
    public readonly branchId: string,
    public readonly serviceType: EnergyServiceType,
    public readonly providerName: string,
    public readonly contractId: string,
    public readonly pricingModel: TariffDTO['pricingModel'],
    public readonly baseRate: number,
    public readonly validFrom: string,
    public readonly validTo: string,
    public readonly currency: string = 'ILS',
    public readonly status: TariffDTO['status'] = 'ACTIVE',
    public readonly buildingId?: string
  ) {
    this.assertIdentity();
  }

  static fromMutation(
    orgId: string,
    branchId: string,
    serviceType: EnergyServiceType,
    dto: TariffDTO
  ): TariffEntity {
    const resolvedId = dto.id?.trim() || generateTariffId();
    return new TariffEntity(
      resolvedId,
      dto.orgId ?? orgId,
      dto.branchId ?? branchId,
      dto.serviceType ?? serviceType,
      dto.providerName,
      dto.contractId,
      dto.pricingModel,
      dto.baseRate,
      dto.validFrom,
      dto.validTo,
      dto.currency,
      dto.status,
      dto.buildingId
    );
  }

  assertIdentity(): void {
    if (!this.id?.trim()) throw new SmsDomainError('Tariff.id required');
    if (!this.orgId?.trim()) throw new SmsDomainError('Tariff.orgId required');
    if (!this.branchId?.trim()) throw new SmsDomainError('Tariff.branchId required');
    if (this.validTo < this.validFrom) {
      throw new SmsDomainError('Tariff.validTo must be >= validFrom');
    }
  }

  toValue(): TariffDTO {
    return {
      id: this.id,
      orgId: this.orgId,
      branchId: this.branchId,
      serviceType: this.serviceType,
      providerName: this.providerName,
      contractId: this.contractId,
      pricingModel: this.pricingModel,
      baseRate: this.baseRate,
      currency: this.currency,
      validFrom: this.validFrom,
      validTo: this.validTo,
      status: this.status,
      ...(this.buildingId !== undefined ? { buildingId: this.buildingId } : {})
    };
  }
}
