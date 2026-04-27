import { Component, OnInit, inject, OnDestroy, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
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
  private cdr = inject(ChangeDetectorRef);

  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  // --- UI State ---
  isLoading = true;
  errorMessage: string | null = null;
  invoice: any = null;

  private statusSubscription?: Subscription;

  ngOnInit() {
    const snapshot = this.stateService.getSnapshot();
    const currentId = snapshot.invoiceId;

    console.log("🛠️ [VALIDATION] Snapshot inicial:", snapshot);

    // 1. Si ya tenemos la data (por navegación previa)
    if (snapshot.extractedData) {
      console.log("📦 [VALIDATION] Datos detectados en State. Saltando espera.");
      this.invoice = snapshot.extractedData;
      this.isLoading = false;
      return;
    }

    // 2. Si no hay data, iniciamos la escucha en tiempo real
    if (currentId) {
      console.log(`🎯 [VALIDATION] Iniciando flujo para ID: ${currentId}`);
      this.isLoading = true;
      this.subscribeToUpdates(currentId);
    } else {
      console.error("⚠️ [VALIDATION] Error: No existe invoiceId en el State.");
      this.errorMessage = 'No se encontró una referencia válida para procesar.';
      this.isLoading = false;
    }
  }

  private subscribeToUpdates(id: string) {
    // Verificamos que el ID tenga el formato esperado (Client-Side UUID)
    console.log(`📡 [SUBSCRIPTION] Suscribiéndose al canal AppSync: "${id}"`);

    this.statusSubscription = this.appsyncService.onInvoiceUpdated(id).subscribe({
      next: (response: any) => {
        console.log("📥 [SUBSCRIPTION] Mensaje entrante:", JSON.stringify(response));

        const updated = response?.value?.data?.onInvoiceUpdated || response?.data?.onInvoiceUpdated;

        if (!updated) {
          console.warn("❓ [SUBSCRIPTION] Payload vacío.");
          return;
        }

        console.log(`📊 [SUBSCRIPTION] Nuevo estado: ${updated.status}`);

        // Éxito: La IA terminó el procesamiento
        if (updated.status === 'READY_FOR_REVIEW') {
          console.log("✅ [MATCH] ¡ID Correcto! Rompiendo loop de carga...");

          try {
            this.invoice = typeof updated.extractedData === 'string'
              ? JSON.parse(updated.extractedData)
              : updated.extractedData;

            // Persistimos en el servicio de estado
            this.stateService.setAiData(this.invoice);
            
            this.isLoading = false;
            this.cdr.detectChanges(); // Forzamos actualización de la UI
            
            this.statusSubscription?.unsubscribe();

            this.messageService.add({
              severity: 'success',
              summary: 'Análisis Completo',
              detail: 'Los datos han sido extraídos por la IA.'
            });
          } catch (e) {
            console.error("❌ [DATA] Error al procesar extractedData:", e);
            this.errorMessage = "Error al procesar los datos de la IA.";
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        }
        // Error en el pipeline de AWS (Bedrock/Textract)
        else if (updated.status === 'FAILED') {
          console.error("❌ [PIPELINE] El procesamiento falló en el backend.");
          this.isLoading = false;
          this.errorMessage = updated.message || 'Error en el procesamiento de la IA.';
          this.cdr.detectChanges();
          this.statusSubscription?.unsubscribe();
        }
      },
      error: (err) => {
        console.error('❌ [SUBSCRIPTION] Error en el WebSocket:', err);
        this.errorMessage = 'Conexión interrumpida con el servicio de notificaciones.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  async handleConfirm() {
    console.log("💾 [ACTION] Confirmando factura...");
    this.isLoading = true;
    
    try {
      const snapshot = this.stateService.getSnapshot();
      
      // Usamos el operador ! porque ya validamos la existencia del ID en ngOnInit
      const invoiceId = snapshot.invoiceId!;

      const confirmInput = {
        status: 'CONFIRMED',
        extracted_data: JSON.stringify(this.invoice),
        buildingId: snapshot.building,
        meterId: snapshot.meterId,
        costCenterId: snapshot.costCenter,
        notes: snapshot.internalNote
      };

      const result = await this.appsyncService.confirmInvoice(invoiceId, confirmInput);

      if (result.success) {
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Confirmado', 
          detail: 'Factura validada exitosamente.' 
        });
        this.onConfirm.emit();
      } else {
        throw new Error(result.message || "Error al confirmar.");
      }

    } catch (err: any) {
      console.error('❌ [ACTION] Error:', err);
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: err.message 
      });
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  goBack() {
    this.onCancel.emit();
  }

  ngOnDestroy() {
    if (this.statusSubscription) {
      console.log("🔌 [SUBSCRIPTION] Cerrando canal de escucha.");
      this.statusSubscription.unsubscribe();
    }
  }
}