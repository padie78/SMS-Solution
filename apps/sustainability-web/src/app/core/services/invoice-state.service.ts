import { Injectable, signal } from '@angular/core';

export interface InvoiceState {
  buildingId: string;
  serviceType: string;
  meterId: string;
  costCenter: string;
  internalNote: string;
  file: File | null;
  extractedData?: {
    total: number;
    date: string;
    vendor: string;
    consumption?: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceStateService {
  // Inicializamos el signal con un estado vacío pero tipado
  private state = signal<InvoiceState | null>(null);

  setStep1Data(data: any, file: File) {
    this.state.set({ ...data, file });
  }

  setAiData(extractedData: any) {
    const current = this.state();
    if (current) {
      this.state.set({ ...current, extractedData });
    }
  }

  getSnapshot(): InvoiceState | null {
    return this.state();
  }

  clear() {
    this.state.set(null);
  }
}