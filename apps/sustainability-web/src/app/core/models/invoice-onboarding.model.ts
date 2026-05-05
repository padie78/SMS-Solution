/** Fila editable de asignación kWh por medidor (paso 3). */
export interface MeterAllocationRow {
  readonly id: string;
  readonly label: string;
  readonly site: string;
  allocatedKwh: number;
}

/** KPIs del listado administrativo post-onboarding (mock). */
export interface InvoiceAdminStats {
  readonly billedMonthEur: number;
  readonly co2eMonthKg: number;
  readonly pendingReviewCount: number;
  readonly pctVsPriorMonth: number;
}

export type InvoiceAdminStatus = 'VALIDATED' | 'PENDING' | 'FLAGGED';

export interface InvoiceAdminRow {
  readonly id: string;
  readonly provider: string;
  readonly site: string;
  readonly serviceType: 'ELECTRICITY' | 'WATER' | 'GAS';
  readonly dateIso: string;
  readonly amount: number;
  readonly status: InvoiceAdminStatus;
}
