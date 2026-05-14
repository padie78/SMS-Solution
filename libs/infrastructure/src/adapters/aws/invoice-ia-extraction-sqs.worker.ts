import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  buildInitialInvoiceIaTechnicalExtraction,
  parseInvoiceIaExtractionSqsBody
} from '@sms/contracts';
import { RecordInvoiceIaExtractionUseCase } from '@sms/application';
import type { SingleTableWriteContext, TenantOrgContext } from '@sms/domain';
import { DynamoInvoiceRepository } from '../../persistence/repositories/dynamo-invoice.repository.js';

export type InvoiceIaExtractionWorkerDeps = {
  readonly doc: DynamoDBDocumentClient;
  readonly tableName: string;
};

/**
 * Worker SQS: primera escritura (o merge) de `ia_extracted_data` tras evento de extracción IA.
 * El usuario completa `user_validated_data` en un flujo posterior (API / AppSync).
 */
export async function handleInvoiceIaExtractionSqsMessage(
  deps: InvoiceIaExtractionWorkerDeps,
  sqsBody: unknown,
  write: SingleTableWriteContext
): Promise<void> {
  const evt = parseInvoiceIaExtractionSqsBody(sqsBody);
  const ctx: TenantOrgContext = { tenantId: evt.tenantId, orgId: evt.orgId };
  const repo = new DynamoInvoiceRepository(deps.doc, deps.tableName);
  const useCase = new RecordInvoiceIaExtractionUseCase(repo);

  const technical = buildInitialInvoiceIaTechnicalExtraction({
    extractionJobId: evt.extractionJobId,
    ingestionCorrelationId: `${evt.pk}#${evt.sk}`,
    workerHostId: typeof process !== 'undefined' ? process.env.AWS_LAMBDA_LOG_STREAM_NAME ?? '' : ''
  });

  await useCase.execute(ctx, evt.invoiceId, { technicalExtraction: technical }, write);
}
