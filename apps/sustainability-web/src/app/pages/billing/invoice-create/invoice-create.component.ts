import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// PrimeNG Imports
import { StepperModule } from 'primeng/stepper';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

// Steps Components
import { InvoiceUploadComponent } from './steps/upload.component';
import { InvoiceValidationComponent } from './steps/validation.component';

@Component({
  selector: 'app-invoice-create',
  standalone: true,
  imports: [
    CommonModule,
    StepperModule,
    ButtonModule,
    ToastModule,
    InvoiceUploadComponent,
    InvoiceValidationComponent
  ],
  providers: [MessageService], // Necesario para notificaciones de éxito/error
  templateUrl: './invoice-create.component.html',
  styleUrls: ['./invoice-create.component.css']
})
export class InvoiceCreateComponent {
  // Control de progreso del stepper
  activeStep: number = 0;
  
  // Datos temporales del archivo procesado
  processedInvoiceData: any = null;

  constructor(
    private router: Router,
    private messageService: MessageService
  ) {}

  /**
   * Se ejecuta cuando el Paso 1 (Upload) termina con éxito.
   * Recibe el archivo o la respuesta inicial del OCR.
   */
  handleUploadComplete(data: any) {
    this.processedInvoiceData = data;
    this.messageService.add({ 
      severity: 'info', 
      summary: 'File Processed', 
      detail: 'AI has extracted data for validation.' 
    });
    // El cambio de step se maneja vía el let-nextCallback en el HTML
  }

  /**
   * Se ejecuta cuando el Paso 2 (Validación) es confirmado por el usuario.
   */
  handleValidationConfirm(finalData: any) {
    console.log('Final data to save in DB:', finalData);
    
    // Aquí iría la lógica de tu servicio para guardar en DynamoDB
    this.messageService.add({ 
      severity: 'success', 
      summary: 'Sync Complete', 
      detail: 'Invoice registered in Sustainability OS.' 
    });
  }

  /**
   * Navegación de salida
   */
  exit() {
    this.router.navigate(['/billing/invoices']);
  }
}