import type { InvoiceIaExtractedPatch, SingleTableWriteContext, TenantOrgContext } from '@sms/domain';
import type { InvoiceExtractionWriterPort } from '../../ports/invoice-extraction-writer.port.js';
/**
 * Caso de uso: persiste resultados incrementales de IA en `ia_extracted_data`
 * sin acoplarse a AWS (inyecta `InvoiceExtractionWriterPort`).
 */
export declare class RecordInvoiceIaExtractionUseCase {
    private readonly invoices;
    constructor(invoices: InvoiceExtractionWriterPort);
    execute(ctx: TenantOrgContext, invoiceId: string, patch: InvoiceIaExtractedPatch, write: SingleTableWriteContext): Promise<void>;
}
//# sourceMappingURL=record-invoice-ia-extraction.use-case.d.ts.map