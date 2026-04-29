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

// PDF Viewer
import { PdfViewerModule } from 'ng2-pdf-viewer';

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
    ToastModule,
    PdfViewerModule
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

  // --- PDF Viewer State ---
  pdfSrc: any = null;
  zoom: number = 1.0;

  private statusSubscription?: Subscription;

  ngOnInit() {
    const snapshot = this.stateService.getSnapshot();

    // Seteamos el archivo para el visor (ng2-pdf-viewer acepta el Blob/File directamente)
    if (snapshot.file) {
      this.pdfSrc = snapshot.file;
    }

    const currentId = snapshot.invoiceId;

    // Si ya tenemos datos parseados en el estado, los usamos
    if (snapshot.extractedData) {
      this.invoice = snapshot.extractedData;
      this.isLoading = false;
      return;
    }

    // Si no, nos suscribimos a AppSync para esperar el procesamiento de la IA
    if (currentId) {
      this.subscribeToUpdates(currentId);
    } else {
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
            console.log("🔍 [RAW DATA]:", rawData);

            const parsedData = this.parseFlexibleString(rawData);
            console.log("📦 [PARSED]:", parsedData);

            this.invoice = {
              vendor: parsedData.vendor || 'No detectado',
              total: parseFloat(parsedData.total_amount) || 0,
              currency: parsedData.currency || 'EUR',
              date: parsedData.billing_period?.end || '',
              consumption: Array.isArray(parsedData.invoice_lines)
                ? parsedData.invoice_lines
                    .filter((l: any) => l.unit?.toLowerCase().includes('kwh'))
                    .reduce((acc: number, curr: any) => acc + (parseFloat(curr.value) || 0), 0)
                : 0,
              lines: parsedData.invoice_lines || [],
              confidence: 90
            };

            this.stateService.setAiData(this.invoice);
            this.isLoading = false;
            this.cdr.detectChanges();
            this.statusSubscription?.unsubscribe();

          } catch (e) {
            console.error("❌ Error definitivo en el parseo:", e);
            this.isLoading = false;
            this.cdr.detectChanges();
          }
        }
      },
      error: (err) => {
        console.error("Error en suscripción:", err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Procesa strings de respuesta de IA que no son JSON válidos (formato clave=valor).
   */
  private parseFlexibleString(str: string): any {
    if (!str) return {};
    let s = str.trim();
    
    try {
      // Reemplaza clave= por "clave":
      const jsonStyle = s
        .replace(/([a-zA-Z0-9_]+)=/g, '"$1":')
        .replace(/:(?!\s*[{[])([^,}]+)/g, (match, p1) => {
          const val = p1.trim();
          if (val === 'null') return ':null';
          if (val === 'true' || val === 'false') return `:${val}`;
          if (!isNaN(Number(val)) && val.length > 0) return `:${val}`;
          return `:"${val.replace(/"/g, '\\"')}"`;
        });
      
      return JSON.parse(jsonStyle);
    } catch (err) {
      console.warn("⚠️ Falló el parseo automático, intentando fallback...");
      return {};
    }
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
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Confirmado', 
          detail: 'Factura validada correctamente.' 
        });
        setTimeout(() => this.onConfirm.emit(), 1000);
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
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
    this.statusSubscription?.unsubscribe();
  }
}