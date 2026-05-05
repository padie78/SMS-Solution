import type { InvoiceReviewView } from '../../../core/models/invoice-review.model';
import type { InvoiceAdminRow, MeterAllocationRow } from '../../../core/models/invoice-onboarding.model';

/** Promedio histórico mock (kWh) — guardrail ±20%. */
export const MOCK_HISTORICAL_AVG_KWH = 10_000;

export const MOCK_METER_ALLOCATION_TEMPLATE: readonly Omit<MeterAllocationRow, 'allocatedKwh'>[] = [
  { id: 'MTR-MAIN', label: 'Medidor principal BT', site: 'HQ — Edificio A' },
  { id: 'MTR-HVAC', label: 'Chiller circuito 1', site: 'HQ — Edificio A' },
  { id: 'MTR-LIGHT', label: 'Iluminación zonas comunes', site: 'HQ — Anexo' }
];

/** Resultado simulado de OCR tras subida (demo). */
export const MOCK_OCR_INVOICE_REVIEW: InvoiceReviewView = {
  vendor: 'Endesa Energía S.A.',
  invoiceNumber: '2026-ES-88421',
  invoiceDate: '2026-04-28',
  cups: 'ES0021000001234567AB',
  contractReference: 'CTR-998877',
  total: 4288.5,
  netAmount: 3544.2,
  taxAmount: 744.3,
  currency: 'EUR',
  date: '2026-04-28',
  billingPeriodStart: '2026-03-01',
  billingPeriodEnd: '2026-03-31',
  consumption: 12_400,
  lines: [
    { description: 'Energía activa', value: '12400', unit: 'kWh', monetary_cost: 3100 },
    { description: 'Peaje de acceso', value: '1', unit: 'contrato', monetary_cost: 450.5 }
  ],
  confidence: 94
};

export const MOCK_ADMIN_INVOICES: readonly InvoiceAdminRow[] = [
  {
    id: 'INV-2026-001',
    provider: 'Endesa',
    site: 'HQ — Edificio A',
    serviceType: 'ELECTRICITY',
    dateIso: '2026-04-02',
    amount: 15200.4,
    status: 'VALIDATED'
  },
  {
    id: 'INV-2026-002',
    provider: 'Canal de Isabel II',
    site: 'Planta Norte',
    serviceType: 'WATER',
    dateIso: '2026-04-18',
    amount: 4200.0,
    status: 'PENDING'
  },
  {
    id: 'INV-2026-003',
    provider: 'Naturgy',
    site: 'HQ — Anexo',
    serviceType: 'GAS',
    dateIso: '2026-03-22',
    amount: 8900.75,
    status: 'FLAGGED'
  },
  {
    id: 'INV-2026-004',
    provider: 'Iberdrola',
    site: 'HQ — Edificio A',
    serviceType: 'ELECTRICITY',
    dateIso: '2026-03-05',
    amount: 22100.0,
    status: 'VALIDATED'
  }
];
