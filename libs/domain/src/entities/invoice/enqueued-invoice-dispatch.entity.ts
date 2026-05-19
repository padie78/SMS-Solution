import type { InvoiceUploadKey } from '../../value-objects/invoice-upload-key.js';
import { DomainInvariantError } from '../../exceptions/domain-invariant.error.js';

/** Factura encolada para procesamiento asíncrono tras skeleton en DynamoDB. */
export class EnqueuedInvoiceDispatch {
  readonly status = 'ENQUEUED' as const;

  private constructor(
    public readonly uploadKey: InvoiceUploadKey,
    public readonly orgId: string
  ) {
    Object.freeze(this);
  }

  static create(uploadKey: InvoiceUploadKey, orgId: string): EnqueuedInvoiceDispatch {
    const id = orgId?.trim();
    if (!id) {
      throw new DomainInvariantError('EnqueuedInvoiceDispatch.orgId is required');
    }
    return new EnqueuedInvoiceDispatch(uploadKey, id);
  }
}
