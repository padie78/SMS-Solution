import { InvoiceUploadKey } from '../value-objects/invoice-upload-key.js';
import { DomainInvariantError } from '../exceptions/domain-invariant.error.js';

/**
 * Decodifica la S3 key y extrae el SK de factura (`INV#…__filename.pdf`).
 * Formato esperado: `uploads/<userId>/INV#UUID__filename.pdf`
 */
export function extractInvoiceMetadataFromS3Key(rawKey: string): InvoiceUploadKey {
  const key = decodeURIComponent(String(rawKey).replace(/\+/g, ' '));
  const fileName = key.split('/').pop();

  if (!fileName || !fileName.includes('__')) {
    throw new DomainInvariantError(`Protocol Violation: Separator '__' not found in key: ${key}`);
  }

  const invoiceSk = fileName.split('__')[0];
  return InvoiceUploadKey.create(invoiceSk, key);
}
