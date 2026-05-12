import type { InvoiceDTO } from './invoice.dto.js';

/**
 * InvoiceEntity: Representa el dominio de una factura procesada.
 * Centraliza la lógica de negocio y validación de integridad.
 */
export class InvoiceEntity {
  constructor(
    public readonly pk: string,
    public readonly sk: string,
    public readonly aiAnalysis: InvoiceDTO['aiAnalysis'],
    public readonly analyticsDimensions: InvoiceDTO['analyticsDimensions'],
    public readonly climatiqResult: InvoiceDTO['climatiqResult'],
    public readonly extractedData: InvoiceDTO['extractedData'],
    public readonly metadata: InvoiceDTO['metadata'],
    public readonly processedAt: string,
    public readonly totalDaysProrated: number
  ) {
    this.assertDomainInvariants();
  }

  /**
   * Factory Method para crear la entidad desde un DTO validado.
   */
  static fromDTO(dto: InvoiceDTO): InvoiceEntity {
    return new InvoiceEntity(
      dto.pk,
      dto.sk,
      dto.aiAnalysis,
      dto.analyticsDimensions,
      dto.climatiqResult,
      dto.extractedData,
      dto.metadata,
      dto.processedAt,
      dto.totalDaysProrated
    );
  }

  /**
   * Validaciones de reglas de negocio (Invariantes).
   */
  private assertDomainInvariants(): void {
    // 1. Validaciones de Identidad
    if (!this.pk.includes('TENANT#') || !this.pk.includes('#ORG#')) {
      throw new Error('Invalid Partition Key: Must contain Tenant and Org context');
    }

    // 2. Validaciones de Consumo
    if (this.aiAnalysis.value < 0) {
      throw new Error('Consumption value cannot be negative');
    }

    // 3. Validaciones Financieras
    if (this.extractedData.totalAmount < 0) {
      throw new Error('Invoice total amount cannot be negative');
    }

    // 4. Integridad de Fechas
    if (new Date(this.extractedData.billingPeriod.start) > new Date(this.extractedData.billingPeriod.end)) {
      throw new Error('Billing period start cannot be after end date');
    }
  }

  /**
   * Lógica de Negocio: Intensidad de Carbono Monetaria.
   * Relaciona las emisiones de CO2 con el gasto económico.
   */
  getCarbonIntensityPerCurrency(): number {
    const amount = this.extractedData.totalAmount;
    if (amount <= 0) return 0;
    return this.climatiqResult.co2e / amount;
  }

  /**
   * Lógica de Negocio: Consumo Diario Promedio.
   * Útil para normalizar consumos de periodos de diferente duración.
   */
  getDailyAverageConsumption(): number {
    if (this.totalDaysProrated <= 0) return 0;
    return this.aiAnalysis.value / this.totalDaysProrated;
  }

  /**
   * Convierte la entidad de vuelta a un DTO plano.
   */
  toDTO(): InvoiceDTO {
    return {
      pk: this.pk,
      sk: this.sk,
      aiAnalysis: { ...this.aiAnalysis },
      analyticsDimensions: { ...this.analyticsDimensions },
      climatiqResult: { ...this.climatiqResult },
      extractedData: { ...this.extractedData },
      metadata: { ...this.metadata },
      processedAt: this.processedAt,
      totalDaysProrated: this.totalDaysProrated
    };
  }
}