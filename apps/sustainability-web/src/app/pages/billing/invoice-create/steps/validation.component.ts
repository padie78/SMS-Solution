import { Component, OnInit, inject, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';

// Core Services
import { InvoiceStateService } from '../../../../core/services/invoice-state.service';
import { AppSyncService } from '../../../../core/services/appsync.service';

@Component({
  selector: 'app-invoice-validation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    ProgressSpinnerModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './validation.component.html',
  styleUrls: ['./validation.component.css']
})
export class InvoiceValidationComponent implements OnInit, OnDestroy {
  private stateService = inject(InvoiceStateService);
  private appsyncService = inject(AppSyncService);
  private messageService = inject(MessageService);

  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  // --- UI State ---
  isLoading = true;
  errorMessage: string | null = null;
  invoice: any = null; // El Golden Record que el usuario validará
  
  private statusSubscription?: Subscription;

  ngOnInit() {
    const snapshot = this.stateService.getSnapshot();

    // 1. Si ya tenemos la data (por navegación entre steps o refresh)
    if (snapshot.extractedData) {
      this.invoice = snapshot.extractedData;
      this.isLoading = false;
      return;
    }

    // 2. Si no hay data pero hay ID, esperamos la notificación real-time
    if (snapshot.invoiceId) {
      this.isLoading = true;
      this.subscribeToUpdates(snapshot.invoiceId);
    } else {
      this.errorMessage = 'No se encontró una referencia válida para procesar.';
      this.isLoading = false;
    }
  }

  private subscribeToUpdates(id: string) {
    console.log(`📡 Escuchando actualizaciones para la factura: ${id}`);
    
    this.statusSubscription = this.appsyncService.onInvoiceUpdated(id).subscribe({
      next: ({ data }: any) => {
        const updated = data.onInvoiceUpdated;

        // Éxito: La IA terminó el Golden Record
        if (updated.status === 'READY_FOR_REVIEW') {
          this.invoice = typeof updated.extractedData === 'string' 
            ? JSON.parse(updated.extractedData) 
            : updated.extractedData;

          // Sincronizamos con el State para persistencia
          this.stateService.setAiData(this.invoice);
          
          this.isLoading = false;
          this.statusSubscription?.unsubscribe();
          
          this.messageService.add({ 
            severity: 'success', 
            summary: 'Análisis Completo', 
            detail: 'Datos extraídos correctamente.' 
          });
        } 
        // Fallo: Error en el pipeline (Textract/Bedrock/Climatiq)
        else if (updated.status === 'FAILED') {
          this.isLoading = false;
          this.errorMessage = updated.message || 'Error en el procesamiento de la IA.';
          this.statusSubscription?.unsubscribe();
        }
      },
      error: (err) => {
        console.error('❌ Subscription Error:', err);
        this.errorMessage = 'Conexión perdida con el servicio de notificaciones.';
        this.isLoading = false;
      }
    });
  }

  /**
   * Acción final: Envía los datos manuales + los datos de la IA confirmados
   */
  async confirm() {
    this.isLoading = true;
    try {
      const snapshot = this.stateService.getSnapshot();
      
      if (!snapshot.invoiceId) throw new Error("Falta el ID de la factura.");

      // Mapeamos el input según el esquema esperado por la mutación ConfirmInvoice
      const confirmInput = {
        status: 'CONFIRMED',
        extracted_data: JSON.stringify(this.invoice), // Datos validados/editados
        buildingId: snapshot.building,
        meterId: snapshot.meterId,
        costCenter: snapshot.costCenter,
        notes: snapshot.internalNote
      };

      // Llamamos al servicio con la firma (id, input)
      const result = await this.appsyncService.confirmInvoice(snapshot.invoiceId, confirmInput);

      if (result.success) {
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Confirmado', 
          detail: 'Factura sincronizada exitosamente.' 
        });
        this.onConfirm.emit(); // Avanzar al último paso del stepper
      } else {
        throw new Error(result.message || "Error desconocido al confirmar.");
      }

    } catch (err: any) {
      console.error('❌ Confirm Error:', err);
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error al confirmar', 
        detail: err.message 
      });
    } finally {
      this.isLoading = false;
    }
  }

  goBack() {
    this.onCancel.emit();
  }

  ngOnDestroy() {
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
    }
  }
}