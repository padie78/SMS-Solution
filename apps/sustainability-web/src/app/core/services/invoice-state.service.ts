// core/services/invoice-state.service.ts
import { Injectable, signal, computed } from '@angular/core';

export interface InvoiceState {
  invoiceId: string | null;
  building: any;
  serviceType: any;
  meterId: any;
  costCenter: any;
  internalNote: string;
  file: File | null;
  storageKey: string | null;
  extractedData: any | null;
}

@Injectable({ providedIn: 'root' })
export class InvoiceStateService {
  // Inicializamos el estado vacío
  private state = signal<InvoiceState>({
    invoiceId: null,
    building: null,
    serviceType: null,
    meterId: null,
    costCenter: null,
    internalNote: '',
    file: null,
    storageKey: null,
    extractedData: null
  });

  // Selector para obtener un snapshot rápido
  getSnapshot() {
    return this.state();
  }

  // EL MÉTODO QUE NECESITAS
  setInvoiceId(id: string) {
    this.state.update(current => ({
      ...current,
      invoiceId: id
    }));
    console.log('🆔 Invoice ID guardado en estado:', id);
  }

  setStorageKey(key: string) {
    this.state.update(current => ({ ...current, storageKey: key }));
  }

  setStep1Data(formData: any, file: File | null) {
    this.state.update(current => ({
      ...current,
      building: formData.building,
      serviceType: formData.serviceType,
      meterId: formData.meterId,
      costCenter: formData.costCenter,
      internalNote: formData.internalNote,
      file: file
    }));
  }

  setAiData(data: any) {
    this.state.update(current => ({
      ...current,
      extractedData: data
    }));
  }

  clear() {
    this.state.set({
      invoiceId: null, building: null, serviceType: null, meterId: null,
      costCenter: null, internalNote: '', file: null, storageKey: null, extractedData: null
    });
  }
}