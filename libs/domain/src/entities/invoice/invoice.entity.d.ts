import type { InvoiceDTO } from '@sms/common';
/**
 * InvoiceEntity: Representa el dominio de una factura procesada.
 * Centraliza la lógica de negocio y validación de integridad.
 */
export declare class InvoiceEntity {
    readonly pk: string;
    readonly sk: string;
    readonly aiAnalysis: InvoiceDTO['aiAnalysis'];
    readonly analyticsDimensions: InvoiceDTO['analyticsDimensions'];
    readonly climatiqResult: InvoiceDTO['climatiqResult'];
    readonly extractedData: InvoiceDTO['extractedData'];
    readonly metadata: InvoiceDTO['metadata'];
    readonly technicalExtraction: InvoiceDTO['technicalExtraction'];
    readonly processedAt: string;
    readonly totalDaysProrated: number;
    constructor(pk: string, sk: string, aiAnalysis: InvoiceDTO['aiAnalysis'], analyticsDimensions: InvoiceDTO['analyticsDimensions'], climatiqResult: InvoiceDTO['climatiqResult'], extractedData: InvoiceDTO['extractedData'], metadata: InvoiceDTO['metadata'], technicalExtraction: InvoiceDTO['technicalExtraction'], processedAt: string, totalDaysProrated: number);
    /**
     * Factory Method para crear la entidad desde un DTO validado.
     */
    static fromDTO(dto: InvoiceDTO): InvoiceEntity;
    /**
     * Validaciones de reglas de negocio (Invariantes).
     */
    private assertDomainInvariants;
    /**
     * Lógica de Negocio: Intensidad de Carbono Monetaria.
     * Relaciona las emisiones de CO2 con el gasto económico.
     */
    getCarbonIntensityPerCurrency(): number;
    /**
     * Lógica de Negocio: Consumo Diario Promedio.
     * Útil para normalizar consumos de periodos de diferente duración.
     */
    getDailyAverageConsumption(): number;
    /**
     * Convierte la entidad de vuelta a un DTO plano.
     */
    toDTO(): InvoiceDTO;
}
//# sourceMappingURL=invoice.entity.d.ts.map