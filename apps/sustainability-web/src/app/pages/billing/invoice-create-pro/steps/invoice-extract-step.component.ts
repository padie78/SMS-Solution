import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CalendarModule } from 'primeng/calendar';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import type {
  InvoiceExtractShape,
  InvoiceExtractStateValue
} from '../invoice-create-pro.types';

@Component({
  selector: 'app-invoice-extract-step',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    InputTextModule,
    InputNumberModule,
    CalendarModule,
    TagModule,
    ProgressSpinnerModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invoice-extract-step.component.html',
  styleUrls: ['./invoice-extract-step.component.css']
})
export class InvoiceExtractStepComponent {
  @Input({ required: true }) form!: FormGroup<InvoiceExtractShape>;

  /**
   * Estado del pipeline IA. Cuando es `uploading` / `awaiting_ai`
   * pintamos un overlay y deshabilitamos los inputs para evitar conflictos.
   */
  @Input() set state(value: InvoiceExtractStateValue) {
    this.stateSignal.set(value);
  }
  get state(): InvoiceExtractStateValue {
    return this.stateSignal();
  }

  protected readonly stateSignal = signal<InvoiceExtractStateValue>('idle');

  protected readonly showOverlay = computed<boolean>(() => {
    const s = this.stateSignal();
    return s === 'uploading' || s === 'awaiting_ai';
  });

  protected readonly stateBadge = computed<{
    severity: 'info' | 'success' | 'warning' | 'danger';
    key: string;
  }>(() => {
    switch (this.stateSignal()) {
      case 'uploading':
        return { severity: 'info', key: 'INVOICE_WIZARD.EXTRACT.STATE.UPLOADING' };
      case 'awaiting_ai':
        return { severity: 'info', key: 'INVOICE_WIZARD.EXTRACT.STATE.AWAITING_AI' };
      case 'ready':
        return { severity: 'success', key: 'INVOICE_WIZARD.EXTRACT.STATE.READY' };
      case 'failed':
        return { severity: 'danger', key: 'INVOICE_WIZARD.EXTRACT.STATE.FAILED' };
      default:
        return { severity: 'info', key: 'INVOICE_WIZARD.EXTRACT.STATE.AI_HINT' };
    }
  });
}
