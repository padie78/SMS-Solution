import type { InvoiceDTO } from '@sms/common';
import type { SingleTableInfrastructureFields } from './base-persistence.model.js';

export type InvoiceBusinessBlob = Partial<Omit<InvoiceDTO, 'pk' | 'sk'>>;

export interface InvoiceDbModel extends SingleTableInfrastructureFields {
  entityType: 'INV';
  iaExtractedData: InvoiceBusinessBlob;
  userValidatedData?: InvoiceBusinessBlob;
}

export type InvoicePersistenceModel = InvoiceDbModel;
export type InvoicePersistenceReadModel = InvoiceDbModel;
