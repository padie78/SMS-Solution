import type { InvoiceIaExtractedPatch, SingleTableWriteContext, TenantOrgContext } from '@sms/domain';

import type { InvoiceExtractionWriterPort } from '../../ports/invoice-extraction-writer.port.js';

/**
 * Caso de uso: persiste resultados incrementales de IA en `ia_extracted_data`
 * sin acoplarse a AWS (inyecta `InvoiceExtractionWriterPort`).
 */
export class RecordInvoiceIaExtractionUseCase {
  constructor(private readonly invoices: InvoiceExtractionWriterPort) {}

  execute(
    ctx: TenantOrgContext,
    invoiceId: string,
    patch: InvoiceIaExtractedPatch,
    write: SingleTableWriteContext
  ): Promise<void> {
    return this.invoices.mergeIaExtractedData(ctx, invoiceId, patch, write);
  }
}
