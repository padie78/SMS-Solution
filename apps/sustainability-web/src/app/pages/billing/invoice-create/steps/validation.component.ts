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

  isLoading = true;
  errorMessage: string | null = null;
  invoice: any = null;

  private statusSubscription?: Subscription;

  ngOnInit() {
    const snapshot = this.stateService.getSnapshot();
    // Extraemos el ID a una constante para validarlo
    const currentId = snapshot.invoiceId;

    // 1. Si ya tenemos la data, no esperamos más
    if (snapshot.extractedData) {
      this.invoice = snapshot.extractedData;
      this.isLoading = false;
      return;
    }

    // 2. Validamos que el ID exista antes de pasarlo a la suscripción
    if (currentId) {
      // Aquí adentro TypeScript ya sabe que currentId es STRING (no null)
      this.isLoading = true;
      this.subscribeToUpdates(currentId);
    } else {
      console.error("⚠️ [VALIDATION] Error: invoiceId es null.");
      this.errorMessage = 'No se encontró una referencia válida para procesar.';
      this.isLoading = false;
    }
  }

  private subscribeToUpdates(id: string) {
    // LOG CRÍTICO: Comparar este ID con el que sale en la Lambda de AWS
    console.log(`📡 [SUBSCRIPTION] Escuchando en AppSync para ID: "${id}"`);

    this.statusSubscription = this.appsyncService.onInvoiceUpdated(id).subscribe({
      next: (response: any) => {
        console.log("📥 [SUBSCRIPTION] Mensaje recibido de AppSync:", JSON.stringify(response));

        // AppSync Amplify vs AppSync puro pueden variar la estructura
        const updated = response?.value?.data?.onInvoiceUpdated || response?.data?.onInvoiceUpdated;

        if (!updated) {
          console.warn("❓ [SUBSCRIPTION] El mensaje llegó pero 'onInvoiceUpdated' está vacío.");
          return;
        }

        console.log(`📊 [SUBSCRIPTION] Cambio de estado detectado: ${updated.status}`);

        if (updated.status === 'READY_FOR_REVIEW') {
          console.log("✅ [SUCCESS] ¡Golden Record listo! Rompiendo loop...");

          try {
            this.invoice = typeof updated.extractedData === 'string'
              ? JSON.parse(updated.extractedData)
              : updated.extractedData;

            console.log("📄 [DATA] Datos extraídos:", this.invoice);
          } catch (e) {
            console.error("❌ [DATA] Error parseando extractedData:", e);
          }

          this.stateService.setAiData(this.invoice);
          this.isLoading = false;

          // Forzamos el renderizado
          this.cdr.detectChanges();
          console.log("🔄 [UI] Spinner oculto, formulario visible.");

          this.statusSubscription?.unsubscribe();

          this.messageService.add({
            severity: 'success',
            summary: 'Análisis Completo',
            detail: 'Datos extraídos correctamente.'
          });
        }
        else if (updated.status === 'FAILED') {
          console.error("❌ [PIPELINE] La IA falló en el procesamiento.");
          this.isLoading = false;
          this.errorMessage = updated.message || 'Error en el procesamiento de la IA.';
          this.cdr.detectChanges();
          this.statusSubscription?.unsubscribe();
        }
      },
      error: (err) => {
        console.error('❌ [SUBSCRIPTION] Error fatal en el socket:', err);
        this.errorMessage = 'Conexión perdida con el servicio de notificaciones.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  async handleConfirm() {
    console.log("💾 [ACTION] Iniciando confirmación manual...");
    this.isLoading = true;
    try {
      const snapshot = this.stateService.getSnapshot();

      const confirmInput = {
        status: 'CONFIRMED',
        extracted_data: JSON.stringify(this.invoice),
        buildingId: snapshot.building,
        meterId: snapshot.meterId,
        costCenterId: snapshot.costCenter,
        notes: snapshot.internalNote
      };

      console.log("📤 [ACTION] Enviando confirmInvoice:", confirmInput);
      const result = await this.appsyncService.confirmInvoice(snapshot.invoiceId, confirmInput);

      if (result.success) {
        console.log("✅ [ACTION] Sincronización exitosa.");
        this.onConfirm.emit();
      } else {
        throw new Error(result.message || "Error desconocido.");
      }

    } catch (err: any) {
      console.error('❌ [ACTION] Error al confirmar:', err);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  goBack() {
    console.log("🔙 [UI] El usuario canceló la validación.");
    this.onCancel.emit();
  }

  ngOnDestroy() {
    if (this.statusSubscription) {
      console.log("🔌 [SUBSCRIPTION] Limpiando suscripción al destruir componente.");
      this.statusSubscription.unsubscribe();
    }
  }
}