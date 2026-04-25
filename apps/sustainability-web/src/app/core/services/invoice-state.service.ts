import { Injectable, signal } from '@angular/core';

export interface InvoiceState {
  building: string;
  serviceType: string;
  meterId: string;
  costCenter: string;
  internalNote: string;
  file: File | null;
  storageKey?: string; // <--- Agregamos la referencia real de S3 (con timestamp)
  extractedData?: {
    total: number;
    date: string;
    vendor: string;
    consumption?: number;
    co2e?: number;
    category?: string;
    confidence?: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceStateService {
  // Inicializamos el signal con null o un objeto vacío según prefieras
  private state = signal<InvoiceState | null>(null);

  /**
   * Guarda los datos iniciales del formulario y el archivo seleccionado.
   */
  setStep1Data(data: any, file: File) {
    this.state.set({ 
      ...data, 
      file,
      storageKey: undefined // Limpiamos cualquier key previa al subir un nuevo archivo
    });
  }

  /**
   * Actualiza la Key real que devuelve S3 tras el upload.
   * VITAL: Esta es la que debes pasar a processInvoiceIA.
   */
  setStorageKey(storageKey: string) {
    const current = this.state();
    if (current) {
      this.state.set({ ...current, storageKey });
    }
  }

  /**
   * Guarda los resultados procesados por la IA.
   */
  setAiData(extractedData: any) {
    const current = this.state();
    if (current) {
      this.state.set({ ...current, extractedData });
    }
  }

  /**
   * Retorna el valor actual del estado (snapshot).
   */
  getSnapshot(): InvoiceState | null {
    return this.state();
  }

  /**
   * Limpia el estado completamente.
   */
  clear() {
    this.state.set(null);
  }
}