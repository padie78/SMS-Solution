import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

// Pasos
import { InvoiceUploadComponent } from './steps/upload.component';
import { InvoiceValidationComponent } from './steps/validation.component';

// Estado Global
import { InvoiceStateService } from '../../../core/services/invoice-state.service';

@Component({
  selector: 'app-invoice-create',
  standalone: true,
  imports: [
    CommonModule,
    InvoiceUploadComponent,
    InvoiceValidationComponent
  ],
  templateUrl: './invoice-create.component.html',
  styleUrls: ['./invoice-create.component.css']
})
export class InvoiceCreateComponent {
  // Inyección del servicio de estado (Management de Signals)
  private stateService = inject(InvoiceStateService);

  currentStep: number = 1;
  isLoadingIA: boolean = false;

  // Propiedad para pasar datos extraídos al Paso 2
  extractedInvoiceData: any = null;

  /**
   * Se ejecuta cuando el Paso 1 (Upload) termina con éxito.
   * El hijo ya guardó los metadatos y el File en el Service.
   */
  handleStep1Complete() {
    this.isLoadingIA = true;
    
    // Simulamos la llamada al motor de IA (Textract/Bedrock)
    // En un escenario real, aquí llamarías a tu API enviando el archivo
    setTimeout(() => {
      const snapshot = this.stateService.getSnapshot();
      
      // Datos mockeados que vendrían de la extracción de IA
      this.extractedInvoiceData = {
        total: 1450.75, // Valor detectado en el PDF
        date: '2026-04-20',
        vendor: 'Energía Global S.A.',
        meterId: snapshot?.meterId // Mantenemos el contexto manual
      };

      this.isLoadingIA = false;
      this.currentStep = 2;
    }, 2000);
  }

  /**
   * Se ejecuta cuando el usuario confirma los datos en el Paso 2.
   */
  handleFinalConfirm(finalData: any) {
    console.log('Sincronizando con DynamoDB...', {
      context: this.stateService.getSnapshot(),
      confirmedValues: finalData
    });
    
    // Lógica para cerrar el stepper o navegar al dashboard
    this.stateService.clear(); // Limpiamos estado en memoria
  }

  handleBack() {
    this.currentStep = 1;
  }
}