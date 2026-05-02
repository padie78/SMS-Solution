import { Injectable, signal, computed } from '@angular/core';
import type { InvoiceReviewView } from '../../core/models/invoice-review.model';
import type {
  InvoiceAssignmentMeta,
  InvoiceHierarchySelection
} from '../../core/models/invoice-assignment.model';
import { emptyAssignmentMeta, emptyHierarchy } from '../../core/models/invoice-assignment.model';

export interface InvoiceState {
  invoiceId: string | null;
  storageKey: string | null;
  file: File | null;
  extractedData: InvoiceReviewView | null;
  hierarchy: InvoiceHierarchySelection;
  assignmentMeta: InvoiceAssignmentMeta;
  internalNote: string;
}

const emptyState = (): InvoiceState => ({
  invoiceId: null,
  storageKey: null,
  file: null,
  extractedData: null,
  hierarchy: emptyHierarchy(),
  assignmentMeta: emptyAssignmentMeta(),
  internalNote: ''
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

  /** Step 1 — ingest only (PDF); clears prior hierarchy assignment */
  setIngestPayload(file: File | null): void {
    this.state.update((current) => ({
      ...current,
      file,
      hierarchy: emptyHierarchy(),
      assignmentMeta: emptyAssignmentMeta(),
      extractedData: null
    }));
  }

  setAiData(data: InvoiceReviewView): void {
    this.state.update((current) => ({ ...current, extractedData: data }));
  }

  patchExtractedOptimistic(data: InvoiceReviewView): void {
    this.setAiData(data);
  }

  patchHierarchy(partial: Partial<InvoiceHierarchySelection>): void {
    this.state.update((current) => ({
      ...current,
      hierarchy: { ...current.hierarchy, ...partial }
    }));
  }

  replaceHierarchy(full: InvoiceHierarchySelection): void {
    this.state.update((current) => ({ ...current, hierarchy: { ...full } }));
  }

  patchAssignmentMeta(partial: Partial<InvoiceAssignmentMeta>): void {
    this.state.update((current) => ({
      ...current,
      assignmentMeta: { ...current.assignmentMeta, ...partial }
    }));
  }

  setInternalNote(note: string): void {
    this.state.update((current) => ({ ...current, internalNote: note }));
  }

  clear(): void {
    this.state.set(emptyState());
  }
}
