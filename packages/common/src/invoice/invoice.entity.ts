import type { InvoiceDTO } from './invoice.dto.js';

/** Factura / snapshot consumo para líneas billing→carbono (sin DynamoDB). */
export class InvoiceEntity {
  constructor(
    public readonly amount: number,
    public readonly kwhConsumption: number,
    public readonly facilityId: string,
    public readonly billingPeriod: string
  ) {
    this.assertDomainInvariants();
  }

  static fromDTO(dto: InvoiceDTO): InvoiceEntity {
    return new InvoiceEntity(dto.amount, dto.kwhConsumption, dto.facilityId, dto.billingPeriod);
  }

  assertDomainInvariants(): void {
    if (!Number.isFinite(this.amount)) throw new Error('amount must be finite');
    if (!Number.isFinite(this.kwhConsumption) || this.kwhConsumption < 0) {
      throw new Error('kwhConsumption must be a non-negative finite number');
    }
    if (!this.facilityId?.trim()) throw new Error('facilityId is required');
    if (!this.billingPeriod?.trim()) throw new Error('billingPeriod is required');
    if (Number.isNaN(Date.parse(this.billingPeriod))) {
      throw new Error('billingPeriod must be parseable as a date');
    }
  }

  kwhPerCurrencyUnit(): number | null {
    if (this.amount <= 0) return null;
    return this.kwhConsumption / this.amount;
  }

  toValue(): InvoiceDTO {
    return {
      amount: this.amount,
      kwhConsumption: this.kwhConsumption,
      facilityId: this.facilityId,
      billingPeriod: this.billingPeriod
    };
  }
}
