import { Injectable, signal, computed } from '@angular/core';

export type InvoiceWorkflowPhase =
  | 'idle'
  | 'uploading'
  | 'awaiting_ai'
  | 'identifying_asset'
  | 'ready_for_review'
  | 'confirming'
  | 'confirmed'
  | 'error';

/** Validation-by-exception — how hierarchy assignment was obtained */
export type InvoiceIdentificationMode =
  | 'pending'
  | 'auto_matched'
  | 'exception'
  | 'user_correcting';

@Injectable({ providedIn: 'root' })
export class WorkflowStateService {
  private readonly phase = signal<InvoiceWorkflowPhase>('idle');
  private readonly lastError = signal<string | null>(null);
  private readonly identificationMode = signal<InvoiceIdentificationMode>('pending');

  readonly currentPhase = computed(() => this.phase());
  readonly errorMessage = computed(() => this.lastError());
  readonly currentIdentificationMode = computed(() => this.identificationMode());

  setPhase(p: InvoiceWorkflowPhase): void {
    this.phase.set(p);
    if (p !== 'error') {
      this.lastError.set(null);
    }
  }

  setError(message: string): void {
    this.lastError.set(message);
    this.phase.set('error');
  }

  /** Called when extracted invoice is loaded and resolver starts / completes */
  setIdentificationMode(mode: InvoiceIdentificationMode): void {
    this.identificationMode.set(mode);
  }

  resetIdentification(): void {
    this.identificationMode.set('pending');
  }

  reset(): void {
    this.phase.set('idle');
    this.lastError.set(null);
    this.identificationMode.set('pending');
  }
}
