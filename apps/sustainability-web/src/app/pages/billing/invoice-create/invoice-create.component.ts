import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvoiceUploadComponent } from './steps/upload.component';
import { InvoiceValidationComponent } from './steps/validation.component';
// Asegúrate de que esta ruta sea exacta según tu carpeta apps/sustainability-web/...
import { InvoiceStateService } from '../../../core/services/invoice-state.service'; 

@Component({
  selector: 'app-invoice-create',
  standalone: true,
  imports: [CommonModule, InvoiceUploadComponent, InvoiceValidationComponent],
  templateUrl: './invoice-create.component.html'
})
export class InvoiceCreateComponent {
  private stateService = inject(InvoiceStateService);
  
  currentStep: number = 1;
  isLoadingIA: boolean = false;
  extractedInvoiceData: any = null;

  async handleStep1Complete() {
    const snapshot = this.stateService.getSnapshot();
    if (!snapshot || !snapshot.file) return;

    this.isLoadingIA = true;

    try {
      // 1. Aquí iría tu llamada al servidor (Node.js/AWS SDK)
      // const response = await this.apiService.processInvoice(snapshot.file, snapshot.meterId);
      
      // Simulación de respuesta del servidor tras procesar con IA
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const mockAiResult = {
        total: 1450.75,
        date: '2026-04-20',
        vendor: 'ENERGIA GLOBAL S.A.',
        consumption: 520.5
      };

      // 2. Guardamos el resultado de la IA en el estado global
      this.stateService.setAiData(mockAiResult);
      this.extractedInvoiceData = mockAiResult;

      // 3. Recién ahora avanzamos al Paso 2
      this.currentStep = 2;
    } catch (error) {
      console.error("Error en la extracción de IA", error);
    } finally {
      this.isLoadingIA = false;
    }
  }

  handleFinalConfirm(confirmedData: any) {
    const finalPayload = {
      metadata: this.stateService.getSnapshot(),
      validatedData: confirmedData
    };
    
    console.log('Final Payload para DynamoDB:', finalPayload);
    this.stateService.clear();
    // Navegar a lista de facturas o mostrar éxito
  }

  handleBack() {
    this.currentStep = 1;
  }
}