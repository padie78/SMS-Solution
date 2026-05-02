import type { Observable } from 'rxjs';

/** Dynamo-style invoice PK used by this app’s upload flow */
export type InvoiceDynamoId = `INV#${string}`;

export function toInvoiceDynamoId(uuid: string): InvoiceDynamoId {
  return `INV#${uuid}`;
}

export function assertInvoiceDynamoId(id: string): InvoiceDynamoId {
  if (!id.startsWith('INV#')) {
    throw new Error(`Invalid invoice id format: ${id}`);
  }
  return id as InvoiceDynamoId;
}

export interface PresignedUrlResponse {
  uploadURL: string;
  key: string;
  invoiceId: string;
}

export interface CreateInvoiceInput {
  tenantId: string;
  invoiceId: string;
  storageKey: string;
  serviceType: string;
  buildingId: string;
  meterId: string;
  costCenterId: string;
  internalNote?: string;
}

export interface CreateInvoiceResult {
  id: string;
  status: string;
  storageKey: string;
}

export type ConfirmInvoiceStatus = 'CONFIRMED';

export interface ConfirmInvoiceInput {
  status: ConfirmInvoiceStatus;
  extracted_data: string;
  buildingId: string;
  meterId: string | null;
  costCenterId: string;
  notes: string;
  regionId?: string;
  branchId?: string;
  assetId?: string;
  serviceType?: string;
}

export interface ResolveInvoiceAssignmentInput {
  cups?: string;
  meterSerialNumber?: string;
  contractReference?: string;
  holderTaxId?: string;
  supplyAddress?: string;
}

export interface InvoiceAssignmentResolution {
  matched: boolean;
  matchTier: string;
  regionId?: string | null;
  branchId?: string | null;
  buildingId?: string | null;
  assetId?: string | null;
  meterId?: string | null;
  costCenterId?: string | null;
}

export interface LinkAssetExternalIdentifierInput {
  cups?: string;
  meterSerialNumber?: string;
  contractReference?: string;
  holderTaxId?: string;
  supplyAddress?: string;
}

export interface ConfirmInvoiceResult {
  success: boolean;
  message: string;
  id: string;
}

export interface InvoiceUpdatedPayload {
  id: string;
  status: string;
  /** AWSJSON: puede llegar como string JSON, objeto ya parseado o JSON escapado dos veces */
  extractedData?: unknown;
}

/** Amplify GraphQL subscription event shape (narrowed for our handler) */
export type InvoiceUpdatedGraphqlEvent = {
  data?: { onInvoiceUpdated?: InvoiceUpdatedPayload };
  value?: { data?: { onInvoiceUpdated?: InvoiceUpdatedPayload } };
};

export type InvoiceUpdatedSubscription = Observable<InvoiceUpdatedGraphqlEvent>;

export interface YearlyKpiRow {
  id: string;
  source: string;
  value: number;
  unit: string;
}

export interface AnalyticsResponse {
  id: string;
  ghg_total_co2e_kg?: number | null;
  consumption_elec_val?: number | null;
  consumption_gas_val?: number | null;
  last_updated?: string | null;
}

export interface GetPrecalculatedKpiData {
  getPrecalculatedKPI: AnalyticsResponse | null;
}
