import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG (Asegúrate de importar los módulos de Stepper en tu app.config o módulo principal)
import { StepperModule } from 'primeng/stepper'; 
import { ButtonModule } from 'primeng/button';

// Pasos e Infraestructura
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
  // Inyección correcta usando el motor de Angular
  private stateService = inject(InvoiceStateService);

  stepper = {
    currentStepIndex: 0 // Base 0 para p-stepper
  };

  isLoadingIA: boolean = false;
  extractedInvoiceData: any = null;

  /**
   * Maneja la transición del Paso 1 al 2.
   * Aquí es donde se invoca el "AI Extraction Pipeline".
   */
  async handleStep1Complete(nextCallback: Function) {
    this.isLoadingIA = true;
    
    try {
      // Simulación de llamada a AWS Bedrock / Textract vía tu API Node.js
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const aiResponse = {
        total: 1450.75,
        date: '2026-04-20',
        vendor: 'ENERGIA GLOBAL S.A.',
        consumption: 520.5
      };

      // Actualizamos el State Manager
      this.stateService.setAiData(aiResponse);
      this.extractedInvoiceData = aiResponse;

      this.isLoadingIA = false;
      
      // Ejecutamos el callback de PrimeNG para cambiar de panel
      nextCallback(); 
      
    } catch (error) {
      this.isLoadingIA = false;
      console.error("Pipeline Error:", error);
    }
  }

  /**
   * Maneja la confirmación final y sincronización.
   */
  async handleFinalConfirm(confirmedData: any, nextCallback: Function) {
    this.isLoadingIA = true;
    
    try {
      // Registro final en DynamoDB
      await new Promise(resolve => setTimeout(resolve, 1500));
      this.isLoadingIA = false;
      nextCallback(); 
    } catch (error) {
      this.isLoadingIA = false;
      console.error("Sync Error:", error);
    }
  }

  handleBack(prevCallback: Function) {
    prevCallback();
  }

  resetProcess() {
    this.stateService.clear();
    this.stepper.currentStepIndex = 0;
    this.extractedInvoiceData = null;
  }
}