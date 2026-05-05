import { Injectable, computed, signal } from '@angular/core';
import type { InvoiceReviewView } from '../../../core/models/invoice-review.model';
import type { MeterAllocationRow } from '../../../core/models/invoice-onboarding.model';
import { InvoiceStateService } from '../../../services/state/invoice-state.service';
import {
  MOCK_HISTORICAL_AVG_KWH,
  MOCK_METER_ALLOCATION_TEMPLATE,
  MOCK_OCR_INVOICE_REVIEW
} from '../data/invoice-onboarding.mock';

const CO2E_FACTOR_KG_PER_KWH = 0.00028;

@Injectable({ providedIn: 'root' })
export class InvoiceOnboardingUiService {
  constructor(private readonly invoiceState: InvoiceStateService) {}

  readonly gatePassed = signal(false);
  readonly isOCR = signal(true);
  readonly ocrSimulating = signal(false);
  readonly ocrProgress = signal(0);
  readonly showSuccess = signal(false);
  readonly successCo2eKg = signal(0);
  /** Declaración jurada — obligatoria solo si hay advertencia de desviación. */
  readonly deviationAcknowledged = signal(false);
  readonly meterRows = signal<MeterAllocationRow[]>([]);

  readonly historicalAvgKwh = (): number => MOCK_HISTORICAL_AVG_KWH;

  readonly consumptionDeviationPct = computed(() => {
    const inv = this.invoiceState.getSnapshot().extractedData;
    if (!inv?.consumption || inv.consumption <= 0) return 0;
    const avg = MOCK_HISTORICAL_AVG_KWH;
    if (avg <= 0) return 0;
    return (Math.abs(inv.consumption - avg) / avg) * 100;
  });

  readonly hasConsumptionDeviationWarning = computed(
    () => this.consumptionDeviationPct() > 20
  );

  selectOcrPath(): void {
    this.isOCR.set(true);
  }

  selectManualPath(): void {
    this.isOCR.set(false);
  }

  passGate(): void {
    this.gatePassed.set(true);
  }

  resetFlow(): void {
    this.gatePassed.set(false);
    this.isOCR.set(true);
    this.ocrSimulating.set(false);
    this.ocrProgress.set(0);
    this.showSuccess.set(false);
    this.successCo2eKg.set(0);
    this.deviationAcknowledged.set(false);
    this.meterRows.set([]);
  }

  /** Tras subida: simula OCR o avanza rápido en modo manual; rellena `extractedData` solo en OCR. */
  async runPostUploadPipeline(): Promise<void> {
    if (this.isOCR()) {
      this.ocrSimulating.set(true);
      this.ocrProgress.set(0);
      for (let p = 0; p <= 100; p += 5) {
        this.ocrProgress.set(p);
        await new Promise<void>((r) => setTimeout(r, 45));
      }
      this.ocrProgress.set(100);
      this.invoiceState.patchExtractedOptimistic({ ...MOCK_OCR_INVOICE_REVIEW });
      this.ocrSimulating.set(false);
      return;
    }
    const emptyDraft: InvoiceReviewView = {
      vendor: '',
      invoiceNumber: '',
      invoiceDate: '',
      total: 0,
      currency: 'EUR',
      date: '',
      consumption: 0,
      lines: [],
      confidence: 0
    };
    this.invoiceState.patchExtractedOptimistic(emptyDraft);
  }

  initMeterRowsFromConsumption(): void {
    const inv = this.invoiceState.getSnapshot().extractedData;
    const total = inv?.consumption ?? 0;
    const n = MOCK_METER_ALLOCATION_TEMPLATE.length;
    const base = n > 0 ? Math.floor(total / n) : 0;
    const remainder = n > 0 ? total - base * n : 0;
    const rows: MeterAllocationRow[] = MOCK_METER_ALLOCATION_TEMPLATE.map((m, i) => ({
      ...m,
      allocatedKwh: base + (i === 0 ? remainder : 0)
    }));
    this.meterRows.set(rows);
  }

  patchMeterRow(id: string, kwh: number): void {
    this.meterRows.update((rows) =>
      rows.map((r) => (r.id === id ? { ...r, allocatedKwh: Math.max(0, kwh) } : r))
    );
  }

  readonly allocatedTotalKwh = computed(() =>
    this.meterRows().reduce((acc, r) => acc + (Number.isFinite(r.allocatedKwh) ? r.allocatedKwh : 0), 0)
  );

  allocationMatchesInvoice(): boolean {
    const inv = this.invoiceState.getSnapshot().extractedData;
    const target = inv?.consumption ?? 0;
    return Math.abs(this.allocatedTotalKwh() - target) < 0.01;
  }

  computeSuccessCo2FromInvoice(): void {
    const inv = this.invoiceState.getSnapshot().extractedData;
    const kwh = inv?.consumption ?? 0;
    this.successCo2eKg.set(Math.round(kwh * CO2E_FACTOR_KG_PER_KWH * 1000) / 1000);
  }

  finalizeSuccessView(): void {
    this.computeSuccessCo2FromInvoice();
    this.showSuccess.set(true);
  }

  setDeviationAck(v: boolean): void {
    this.deviationAcknowledged.set(v);
  }

  canSubmitGuardrail(): boolean {
    if (!this.hasConsumptionDeviationWarning()) {
      return true;
    }
    return this.deviationAcknowledged();
  }
}
