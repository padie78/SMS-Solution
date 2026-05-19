import type { InvoiceUploadKey } from '../../value-objects/invoice-upload-key.js';
import { DomainInvariantError } from '../../exceptions/domain-invariant.error.js';

/** Evento de negocio: objeto de factura recibido en S3 y listo para despacho. */
export class InvoiceS3PutReceived {
  private constructor(
    public readonly requestId: string,
    public readonly bucket: string,
    public readonly uploadKey: InvoiceUploadKey
  ) {
    Object.freeze(this);
  }

  static create(
    requestId: string,
    bucket: string,
    uploadKey: InvoiceUploadKey
  ): InvoiceS3PutReceived {
    const rid = requestId?.trim();
    const b = bucket?.trim();
    if (!rid) {
      throw new DomainInvariantError('InvoiceS3PutReceived.requestId is required');
    }
    if (!b) {
      throw new DomainInvariantError('InvoiceS3PutReceived.bucket is required');
    }
    return new InvoiceS3PutReceived(rid, b, uploadKey);
  }
}
