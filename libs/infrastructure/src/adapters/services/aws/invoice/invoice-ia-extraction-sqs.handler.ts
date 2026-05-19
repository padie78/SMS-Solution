import {
  buildInitialInvoiceIaTechnicalExtraction,
  parseInvoiceIaExtractionSqsBody
} from '@sms/common';
import type { RecordInvoiceIaExtractionUseCase } from '@sms/application';
import type { SingleTableWriteContext, TenantOrgContext } from '@sms/domain';

export type InvoiceIaExtractionSqsHandlerDeps = {
  readonly recordInvoiceIaExtraction: RecordInvoiceIaExtractionUseCase;
};

/** @deprecated Usar `InvoiceIaExtractionSqsHandlerDeps`. */
export type InvoiceIaExtractionWorkerDeps = InvoiceIaExtractionSqsHandlerDeps;

/**
 * Handler SQS (adaptador de entrada): delega en el caso de uso inyectado.
 * El composition root vive en `config/record-invoice-ia-extraction.factory.ts`.
 */
export async function handleInvoiceIaExtractionSqsMessage(
  deps: InvoiceIaExtractionSqsHandlerDeps,
  sqsBody: unknown,
  write: SingleTableWriteContext
): Promise<void> {
  const evt = parseInvoiceIaExtractionSqsBody(sqsBody);
  const ctx: TenantOrgContext = { tenantId: evt.tenantId, orgId: evt.orgId };

  const technical = buildInitialInvoiceIaTechnicalExtraction({
    extractionJobId: evt.extractionJobId,
    ingestionCorrelationId: `${evt.pk}#${evt.sk}`,
    workerHostId: typeof process !== 'undefined' ? process.env.AWS_LAMBDA_LOG_STREAM_NAME ?? '' : ''
  });

  await deps.recordInvoiceIaExtraction.execute(ctx, evt.invoiceId, { technicalExtraction: technical }, write);
}
