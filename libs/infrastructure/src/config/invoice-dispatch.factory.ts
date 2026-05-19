import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  DispatchInvoiceFromS3PutUseCase,
  type DispatchInvoiceFromS3PutDeps
} from '@sms/application';

import { DynamoInvoiceDispatchSkeletonAdapter } from '../adapters/services/aws/invoice/dynamo-invoice-dispatch-skeleton.adapter.js';
import { S3InvoiceDispatchOrgResolverAdapter } from '../adapters/services/aws/invoice/s3-invoice-dispatch-org-resolver.adapter.js';
import { SqsInvoiceDispatchQueueAdapter } from '../adapters/services/aws/invoice/sqs-invoice-dispatch-queue.adapter.js';

export type CreateInvoiceDispatchUseCaseParams = {
  readonly doc: DynamoDBDocumentClient;
  readonly tableName: string;
  readonly queueUrl: string | undefined;
};

/** Composition root del dispatcher S3 → skeleton + SQS. */
export function createDispatchInvoiceFromS3PutUseCase(
  params: CreateInvoiceDispatchUseCaseParams
): DispatchInvoiceFromS3PutUseCase {
  const deps: DispatchInvoiceFromS3PutDeps = {
    orgResolver: new S3InvoiceDispatchOrgResolverAdapter(),
    skeletonWriter: new DynamoInvoiceDispatchSkeletonAdapter(params.doc, params.tableName),
    invoiceQueue: new SqsInvoiceDispatchQueueAdapter({ queueUrl: params.queueUrl })
  };
  return new DispatchInvoiceFromS3PutUseCase(deps);
}
