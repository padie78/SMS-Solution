import { Injectable, signal, computed } from '@angular/core';
import type { InvoiceReviewView } from '../../core/models/invoice-review.model';

export interface InvoiceUploadFormSnapshot {
  regionId: string;
  branchId: string;
  serviceType: string;
  building: string;
  meterId: string;
  costCenter: string;
  internalNote: string;
}

export interface InvoiceState {
  invoiceId: string | null;
  regionId: string | null;
  branchId: string | null;
  buildingId: string | null;
  serviceType: string | null;
  meterId: string | null;
  costCenterId: string | null;
  internalNote: string;
  file: File | null;
  storageKey: string | null;
  extractedData: InvoiceReviewView | null;
}

const emptyState = (): InvoiceState => ({
  invoiceId: null,
  regionId: null,
  branchId: null,
  buildingId: null,
  serviceType: null,
  meterId: null,
  costCenterId: null,
  internalNote: '',
  file: null,
  storageKey: null,
  extractedData: null
});

@Injectable({ providedIn: 'root' })
export class InvoiceStateService {
  private readonly state = signal<InvoiceState>(emptyState());

  readonly snapshot = computed(() => this.state());

  getSnapshot(): InvoiceState {
    return this.state();
  }

  setInvoiceId(id: string): void {
    this.state.update((current) => ({ ...current, invoiceId: id }));
  }

  setStorageKey(key: string): void {
    this.state.update((current) => ({ ...current, storageKey: key }));
  }

  setStep1Data(form: InvoiceUploadFormSnapshot, file: File | null): void {
    this.state.update((current) => ({
      ...current,
      regionId: form.regionId,
      branchId: form.branchId,
      buildingId: form.building,
      serviceType: form.serviceType,
      meterId: form.meterId,
      costCenterId: form.costCenter,
      internalNote: form.internalNote ?? '',
      file
    }));
  }

  setAiData(data: InvoiceReviewView): void {
    this.state.update((current) => ({ ...current, extractedData: data }));
  }

  /** Optimistic: mark review payload before server ack */
  patchExtractedOptimistic(data: InvoiceReviewView): void {
    this.setAiData(data);
  }

  clear(): void {
    this.state.set(emptyState());
  }
}
