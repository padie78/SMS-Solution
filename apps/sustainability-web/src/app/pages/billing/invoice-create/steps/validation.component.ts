import { Component, Output, EventEmitter, OnInit, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG 
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { CardModule } from 'primeng/card';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

// Services
import { AppSyncService } from '../../../../core/services/appsync.service';
import { InvoiceStateService } from '../../../../core/services/invoice-state.service';

@Component({
  selector: 'app-invoice-validation',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ButtonModule, 
    InputTextModule, 
    TagModule, 
    TooltipModule,
    ProgressSpinnerModule,
    CardModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './validation.component.html', 
  styleUrls: ['./validation.component.css']
})export class InvoiceValidationComponent implements OnInit {
  private appsyncService = inject(AppSyncService);
  private stateService = inject(InvoiceStateService);
  private messageService = inject(MessageService);

  @Output() onConfirm = new EventEmitter<any>();
  @Output() onBack = new EventEmitter<void>();

  // ✅ UNA SOLA DECLARACIÓN: Objeto interno para la vista
  invoice: any = {
    vendor: '',
    date: '',
    total: 0,
    consumption: 0,
    co2e: 0,
    currency: 'USD',
    category: '',
    confidence: 0
  };

  isLoading = true;
  errorMessage: string | null = null;

  async ngOnInit() {
    const snapshot = this.stateService.getSnapshot();
    
    // Si ya procesamos la IA antes, recuperamos los datos del Signal
    if (snapshot && snapshot.extractedData) {
      this.invoice = { ...snapshot.extractedData };
      this.isLoading = false;
      return;
    }

    // Si no, iniciamos el proceso
    await this.processWithIA();
  }

  async processWithIA(retries = 3) {
    const snapshot = this.stateService.getSnapshot();
    const fileKey = snapshot?.storageKey;

    if (!fileKey) {
      console.error('❌ Error: storageKey es undefined');
      this.errorMessage = "No se encontró la referencia del archivo.";
      this.isLoading = false;
      return; 
    }

    this.isLoading = true;
    this.errorMessage = null;

    for (let i = 0; i <= retries; i++) {
      try {
        console.log(`🚀 [Intento ${i + 1}] Procesando: ${fileKey}`);
        
        // Llamada a AppSync
        const result = await this.appsyncService.processInvoiceIA(
          fileKey, 
          'f3d4f8a2-90c1-708c-a446-2c8592524d62'
        );

        if (result) {
          this.invoice = { ...result };
          this.stateService.setAiData(result); // Guardamos en el Signal global
          this.isLoading = false;
          return; 
        }
      } catch (error: any) {
        // ... tu lógica de reintentos actual (está perfecta) ...
        const isLastRetry = i === retries;
        if (isLastRetry) {
          this.errorMessage = "Fallo definitivo tras reintentos.";
          this.isLoading = false;
        } else {
          const delay = (3000 * (i + 1)) + Math.floor(Math.random() * 1000);
          await new Promise(res => setTimeout(res, delay));
        }
      }
    }
  }

  confirm() {
    if (!this.invoice.vendor || !this.invoice.total) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Datos incompletos', 
        detail: 'Verifica proveedor y monto total.' 
      });
      return;
    }
    this.stateService.setAiData(this.invoice);
    this.onConfirm.emit(this.invoice);
  }

  goBack() {
    this.onBack.emit();
  }
}