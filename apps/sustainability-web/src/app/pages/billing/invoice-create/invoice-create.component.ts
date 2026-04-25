import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StepperModule } from 'primeng/stepper'; 
import { ButtonModule } from 'primeng/button';

import { InvoiceUploadComponent } from './steps/upload.component';
import { InvoiceValidationComponent } from './steps/validation.component';
import { InvoiceStateService } from '../../../core/services/invoice-state.service';

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
  private stateService = inject(InvoiceStateService);

  stepper = {
    currentStepIndex: 0 
  };

  isLoadingIA: boolean = false;

  /**
   * FIX para Línea 14 del HTML: (onComplete)="handleStep1Complete(nextCallback)"
   */
  handleStep1Complete(nextCallback: any) {
    this.executePrimeNGCallback(nextCallback);
  }

  /**
   * FIX para Línea 24 del HTML: (onConfirm)="nextStep($event)"
   * Agregamos este método porque el compilador lo busca específicamente.
   */
  nextStep(data?: any) {
    if (data) {
      this.stateService.setAiData(data);
    }
    // Si no hay callback (porque viene del HTML plano), avanzamos el índice
    this.stepper.currentStepIndex++;
  }

  /**
   * Maneja la confirmación final de la IA con callback de PrimeNG
   */
  async handleFinalConfirm(confirmedData: any, nextCallback: any) {
    this.isLoadingIA = true;
    try {
      this.stateService.setAiData(confirmedData);
      this.executePrimeNGCallback(nextCallback);
    } catch (error) {
      console.error("Sync Error:", error);
    } finally {
      this.isLoadingIA = false;
    }
  }

  /**
   * Navegación hacia atrás (Soporta llamada con o sin argumentos)
   */
  prevStep(prevCallback?: any) {
    if (prevCallback) {
      this.executePrimeNGCallback(prevCallback);
    } else if (this.stepper.currentStepIndex > 0) {
      this.stepper.currentStepIndex--;
    }
  }

  private executePrimeNGCallback(callback: any) {
    if (callback && typeof callback.emit === 'function') {
      callback.emit();
    } else if (typeof callback === 'function') {
      callback();
    } else {
      this.stepper.currentStepIndex++;
    }
  }

  resetProcess() {
    this.stateService.clear();
    this.stepper.currentStepIndex = 0;
  }
}