import { Injectable, signal, computed } from '@angular/core';

export type InvoiceWorkflowPhase =
  | 'idle'
  | 'uploading'
  | 'awaiting_ai'
  | 'ready_for_review'
  | 'confirming'
  | 'confirmed'
  | 'error';

@Injectable({ providedIn: 'root' })
export class WorkflowStateService {
  private readonly phase = signal<InvoiceWorkflowPhase>('idle');
  private readonly lastError = signal<string | null>(null);

  readonly currentPhase = computed(() => this.phase());
  readonly errorMessage = computed(() => this.lastError());

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

  reset(): void {
    this.phase.set('idle');
    this.lastError.set(null);
  }
}
