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

            // 1. Convertimos el string "key=value" a JSON válido
            // Explicación: Pone comillas a las llaves y valores, cambia '=' por ':'
            const jsonValidString = rawData
              .replace(/([a-zA-Z0-9_]+)=/g, '"$1":') // Llaves
              .replace(/:([^"{[,\s][^,}]*)/g, ':"$1"') // Valores (si no son objetos/arrays)
              .replace(/"true"/g, 'true')
              .replace(/"false"/g, 'false')
              .replace(/"([0-9.]+)"/g, (match: string, p1: string) => !isNaN(Number(p1)) ? p1 : match);

            const parsedData = JSON.parse(jsonValidString);
            console.log("📦 [PARSED] Objeto real:", parsedData);

            // 2. Mapeamos a tu interfaz de la UI
            this.invoice = {
              vendor: parsedData.vendor || 'No detectado',
              total: parseFloat(parsedData.total_amount) || 0,
              currency: parsedData.currency || 'EUR',
              // Buscamos la fecha en el objeto anidado billing_period
              date: parsedData.billing_period?.end || '',
              // Buscamos el consumo total sumando las líneas que sean kWh
              consumption: parsedData.invoice_lines
                ? parsedData.invoice_lines
                  .filter((l: any) => l.unit === 'kWh')
                  .reduce((acc: number, curr: any) => acc + parseFloat(curr.value), 0)
                : 0,
              lines: parsedData.invoice_lines || [],
              confidence: 90
            };

            this.stateService.setAiData(this.invoice);
            this.isLoading = false;
            this.cdr.detectChanges();
            this.statusSubscription?.unsubscribe();

          } catch (e) {
            console.error("❌ Error parseando objeto malformado:", e);
            this.errorMessage = "Error al interpretar los datos.";
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