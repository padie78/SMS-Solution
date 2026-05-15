/**
 * Caso de uso: persiste resultados incrementales de IA en `ia_extracted_data`
 * sin acoplarse a AWS (inyecta `InvoiceExtractionWriterPort`).
 */
export class RecordInvoiceIaExtractionUseCase {
    invoices;
    constructor(invoices) {
        this.invoices = invoices;
    }
    execute(ctx, invoiceId, patch, write) {
        return this.invoices.mergeIaExtractedData(ctx, invoiceId, patch, write);
    }
}
//# sourceMappingURL=record-invoice-ia-extraction.use-case.js.map