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

    if (snapshot.file) {
      const localUrl = URL.createObjectURL(snapshot.file);
      this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(localUrl);
    }
    const currentId = snapshot.invoiceId;

    if (snapshot.extractedData) {
      this.invoice = snapshot.extractedData;
      this.isLoading = false;
      return;
    }

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

          // USAMOS UN PARSER MANUAL EN LUGAR DE REGEX + JSON.PARSE
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
    }
  });
}

/**
 * Convierte un string tipo {a=b, c={d=e}} en un objeto real de JS.
 * Es mucho más seguro que usar Regex para JSON.parse.
 */
private parseFlexibleString(str: string): any {
  // 1. Limpiamos el string de posibles saltos de línea o espacios raros
  let s = str.trim();
  
  // 2. Cambiamos '=' por ':' y nos aseguramos de que las llaves y valores tengan comillas
  // Pero lo hacemos de forma que JSON.parse pueda entenderlo finalmente
  try {
    const jsonStyle = s
      .replace(/([a-zA-Z0-9_]+)=/g, '"$1":') // Llaves
      .replace(/:(?!\s*[{[])([^,}]+)/g, (match, p1) => { // Valores simples
        const val = p1.trim();
        if (val === 'null') return ':null';
        if (val === 'true' || val === 'false') return `:${val}`;
        if (!isNaN(Number(val)) && val.length > 0) return `:${val}`;
        return `:"${val.replace(/"/g, '\\"')}"`; // Escapamos comillas internas
      });
    
    return JSON.parse(jsonStyle);
  } catch (err) {
    console.warn("⚠️ Falló el parseo automático, intentando fallback manual...");
    // Fallback: Si el string es muy rebelde, devolvemos un objeto vacío para no romper la UI
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
        this.messageService.add({ severity: 'success', summary: 'Confirmado', detail: 'Factura validada correctamente.' });
        setTimeout(() => this.onConfirm.emit(), 1000);
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