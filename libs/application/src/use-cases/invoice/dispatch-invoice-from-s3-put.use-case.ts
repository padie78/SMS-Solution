import { parseDispatcherEnqueueResult, type DispatcherEnqueueResult } from '@sms/common';
import type { DecodedInvoiceUploadKey } from '@sms/common';
import type { InvoiceDispatchOrgResolverPort } from '../../ports/invoice-dispatch-org-resolver.port.js';
import type { InvoiceDispatchQueuePort } from '../../ports/invoice-dispatch-queue.port.js';
import type { InvoiceDispatchSkeletonWriterPort } from '../../ports/invoice-dispatch-skeleton-writer.port.js';

export type DispatchInvoiceFromS3PutDeps = {
  readonly orgResolver: InvoiceDispatchOrgResolverPort;
  readonly skeletonWriter: InvoiceDispatchSkeletonWriterPort;
  readonly invoiceQueue: InvoiceDispatchQueuePort;
};

/**
 * Caso de uso: S3 PUT de factura → skeleton DynamoDB + mensaje SQS al worker.
 */
export class DispatchInvoiceFromS3PutUseCase {
  constructor(private readonly deps: DispatchInvoiceFromS3PutDeps) {}

  async execute(params: {
    requestId: string;
    bucket: string;
    uploadKey: DecodedInvoiceUploadKey;
  }): Promise<DispatcherEnqueueResult> {
    const { requestId, bucket, uploadKey } = params;
    const { sk, key } = uploadKey;
    const orgId = await this.deps.orgResolver.resolveOrgId({ bucket, key, requestId });

    await this.deps.skeletonWriter.putInvoiceSkeleton({ orgId, sk, bucket, key, requestId });
    await this.deps.invoiceQueue.enqueueInvoice({ bucket, key, orgId, sk, requestId });

    return parseDispatcherEnqueueResult({
      status: 'ENQUEUED',
      invoiceId: sk,
      orgId,
      key
    });
  }
}
