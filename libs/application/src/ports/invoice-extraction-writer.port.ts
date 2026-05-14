import type {
  InvoiceIaExtractedPatch,
  SingleTableWriteContext,
  TenantOrgContext
} from '@sms/domain';

/**
 * Driven port: merge validated IA extraction slices into the invoice aggregate.
 * Implemented by infrastructure (e.g. Dynamo single-table repository).
 */
export interface InvoiceExtractionWriterPort {
  mergeIaExtractedData(
    ctx: TenantOrgContext,
    invoiceId: string,
    patch: InvoiceIaExtractedPatch,
    write: SingleTableWriteContext
  ): Promise<void>;
}
