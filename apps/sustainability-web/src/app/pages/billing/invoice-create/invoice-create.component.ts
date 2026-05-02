import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StepperModule } from 'primeng/stepper'; 
import { ButtonModule } from 'primeng/button';

import { InvoiceUploadComponent } from './steps/upload.component';
import { InvoiceValidationComponent } from './steps/validation.component';
import { InvoiceStateService } from '../../../services/state/invoice-state.service';
import { WorkflowStateService } from '../../../services/state/workflow-state.service';

@Component({
  selector: 'app-invoice-create',
  standalone: true,
  imports: [
    CommonModule,
    StepperModule,
    ButtonModule,
    InvoiceUploadComponent,
    InvoiceValidationComponent
  ],
  templateUrl: './invoice-create.component.html',
  styleUrls: ['./invoice-create.component.css']
})
export class InvoiceCreateComponent {
  private readonly stateService = inject(InvoiceStateService);
  private readonly workflow = inject(WorkflowStateService);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Índice activo: 0 Carga, 1 Ubicación del gasto, 2 Datos de factura, 3 Sincronizar. */
  activeStepIndex = 0;

  private readonly maxStepIndex = 3;

  isLoadingIA: boolean = false;

  /**
   * Tras subir la factura: intenta el callback del Stepper de PrimeNG y, si el índice no sube
   * (p. ej. handler interno sin efecto), fuerza el paso siguiente para no quedar bloqueados en Carga.
   */
  handleStep1Complete(nextCallback: unknown): void {
    const before = this.activeStepIndex;
    this.executePrimeNGCallback(nextCallback);
    if (this.activeStepIndex <= before) {
      this.activeStepIndex = Math.min(before + 1, this.maxStepIndex);
      this.cdr.detectChanges();
    }
  }

  /** Tras confirmar factura en el panel «Datos de factura», avanza al paso final. */
  nextStep(): void {
    this.activeStepIndex = Math.min(this.activeStepIndex + 1, this.maxStepIndex);
  }

  /** Ubicación del gasto → datos de factura (callback PrimeNG + fallback). */
  advanceFromAllocation(nextCallback: unknown): void {
    const before = this.activeStepIndex;
    this.executePrimeNGCallback(nextCallback);
    if (this.activeStepIndex <= before) {
      this.activeStepIndex = Math.min(before + 1, this.maxStepIndex);
      this.cdr.detectChanges();
    }
  }

  /**
   * Navegación hacia atrás (Soporta llamada con o sin argumentos)
   */
  prevStep(prevCallback?: any) {
    if (prevCallback) {
      this.executePrimeNGCallback(prevCallback);
    } else if (this.activeStepIndex > 0) {
      this.activeStepIndex--;
    }
  }

  private executePrimeNGCallback(callback: unknown): void {
    if (this.isEmitLike(callback)) {
      callback.emit();
      return;
    }
    if (typeof callback === 'function') {
      (callback as () => void)();
      return;
    }
    this.activeStepIndex = Math.min(this.activeStepIndex + 1, this.maxStepIndex);
  }

  private isEmitLike(callback: unknown): callback is { emit: () => void } {
    return (
      typeof callback === 'object' &&
      callback !== null &&
      'emit' in callback &&
      typeof (callback as { emit: unknown }).emit === 'function'
    );
  }

  resetProcess() {
    this.stateService.clear();
    this.workflow.reset();
    this.activeStepIndex = 0;
  }
}