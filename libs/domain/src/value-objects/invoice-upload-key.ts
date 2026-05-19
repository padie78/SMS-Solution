import { DomainInvariantError } from '../exceptions/domain-invariant.error.js';

const INVOICE_SK_PATTERN = /^INV#[^\s/]+$/;

/**
 * Clave S3 decodificada + SK de factura (`INV#…__filename.pdf`).
 */
export class InvoiceUploadKey {
  private constructor(
    public readonly invoiceSk: string,
    public readonly objectKey: string
  ) {
    Object.freeze(this);
  }

  static create(invoiceSk: string, objectKey: string): InvoiceUploadKey {
    const sk = invoiceSk?.trim();
    const key = objectKey?.trim();

    if (!sk || sk.length < 5 || !INVOICE_SK_PATTERN.test(sk)) {
      throw new DomainInvariantError(
        'InvoiceUploadKey.invoiceSk must match INV#<id> with no slashes or whitespace'
      );
    }
    if (!key) {
      throw new DomainInvariantError('InvoiceUploadKey.objectKey is required');
    }

    return new InvoiceUploadKey(sk, key);
  }
}
