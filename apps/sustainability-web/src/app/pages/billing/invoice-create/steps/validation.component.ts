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
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

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
  private sanitizer = inject(DomSanitizer);
  private cdr = inject(ChangeDetectorRef);

  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();

  // --- UI State ---
  isLoading = true;
  errorMessage: string | null = null;
  invoice: any = null;

  private statusSubscription?: Subscription;
  pdfUrl?: SafeResourceUrl;

  ngOnInit() {
    const snapshot = this.stateService.getSnapshot();

    // Supongamos que guardaste la URL firmada en el state al subir el archivo
    if (snapshot.file) {
      const localUrl = URL.createObjectURL(snapshot.file);
      this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(localUrl);
    }
    const currentId = snapshot.invoiceId;

    console.log("🛠️ [VALIDATION] Snapshot inicial:", snapshot);

    if (snapshot.extractedData) {
      console.log("📦 [VALIDATION] Datos detectados en State. Saltando espera.");
      this.invoice = snapshot.extractedData;
      this.isLoading = false;
      return;
    }

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
    this.statusSubscription = this.appsyncService.onInvoiceUpdated(id).subscribe({
      next: (response: any) => {
        const updated = response?.value?.data?.onInvoiceUpdated || response?.data?.onInvoiceUpdated;

        if (updated?.status === 'READY_FOR_REVIEW') {
          try {
            const rawData = updated.extractedData;
            console.log("🔍 [DATA] Raw string recibido:", rawData);

            // Función de extracción mejorada para manejar espacios y formatos sucios
            const extractValue = (key: string): string => {
              // Busca la clave, salta el '=' y captura todo hasta la coma o el cierre de llave
              // Soporta espacios en el valor (como 'ELECTRA NOVA')
              const regex = new RegExp(`${key}=([^,}]+)`);
              const match = rawData.match(regex);
              return match ? match[1].trim() : '';
            };

            // Extraemos los datos basándonos en las claves que vimos en tu log anterior
            const vendorName = extractValue('vendor');
            const amount = extractValue('total_amount');
            const curr = extractValue('currency');
            const kwh = extractValue('value'); // Consumo
            const co2 = extractValue('co2e');  // Huella
            const dateEnd = extractValue('end'); // Fecha fin periodo

            this.invoice = {
              vendor: vendorName || 'No detectado',
              total: parseFloat(amount) || 0,
              currency: curr || 'EUR',
              date: dateEnd || '',
              consumption: parseFloat(kwh) || 0,
              co2e: parseFloat(co2) || 0,
              confidence: 90 // Valor por defecto para la visualización
            };

            console.log("💎 [SUCCESS] Objeto mapeado:", this.invoice);

            this.stateService.setAiData(this.invoice);
            this.isLoading = false;
            this.cdr.detectChanges();
            this.statusSubscription?.unsubscribe();

          } catch (e) {
            console.error("❌ Error en extracción manual:", e);
            this.errorMessage = "Error al interpretar los datos de la factura.";
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        }
      }
    });
  }

  async handleConfirm() {
    this.isLoading = true;
    try {
      const snapshot = this.stateService.getSnapshot();
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
        this.messageService.add({ severity: 'success', summary: 'Confirmado', detail: 'Factura validada.' });
        this.onConfirm.emit();
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: err.message });
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  goBack() {
    this.onCancel.emit();
  }

  ngOnDestroy() {
    this.statusSubscription?.unsubscribe();
  }
}