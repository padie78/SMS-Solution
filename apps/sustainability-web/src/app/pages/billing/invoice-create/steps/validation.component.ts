import { Component, Output, EventEmitter, OnInit, inject } from '@angular/core';
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
})
export class InvoiceValidationComponent implements OnInit {
  private appsyncService = inject(AppSyncService);
  private stateService = inject(InvoiceStateService);
  private messageService = inject(MessageService);

  @Output() onConfirm = new EventEmitter<any>();
  @Output() onBack = new EventEmitter<void>();

  // FIX: Inicialización estructural para evitar "Cannot read properties of null"
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
  
  // FIX: Cambiamos .aiData por .extractedData para coincidir con la interfaz
  if (snapshot && snapshot.extractedData) {
    this.invoice = snapshot.extractedData;
    this.isLoading = false;
    return;
  }

  await this.processWithIA();
}

async processWithIA(retries = 3) { // Aumentamos a 3 intentos dada la latencia de la IA
  const snapshot = this.stateService.getSnapshot();
  const fileKey = snapshot?.storageKey;

  if (!fileKey) {
    console.error('❌ Error: storageKey es undefined en el snapshot:', snapshot);
    this.errorMessage = "No se encontró la referencia del archivo en el sistema.";
    this.isLoading = false;
    return; 
  }

  this.isLoading = true;
  this.errorMessage = null;

  for (let i = 0; i <= retries; i++) {
    try {
      console.log(`🚀 [Intento ${i + 1}/${retries + 1}] Procesando: ${fileKey}`);
      
      const result = await this.appsyncService.processInvoiceIA(
        fileKey, 
        'f3d4f8a2-90c1-708c-a446-2c8592524d62'
      );

      if (result) {
        this.invoice = { ...result };
        this.stateService.setAiData(result);
        this.isLoading = false;
        return; 
      }
    } catch (error: any) {
      const isLastRetry = i === retries;
      const errorMsg = error.message || "";

      if (isLastRetry) {
        this.errorMessage = "Superado el límite de intentos. AWS Bedrock está saturado o el archivo es ilegible.";
        this.isLoading = false;
        console.error("❌ Fallo definitivo tras reintentos:", error);
      } else {
        // --- ESTRATEGIA DE ESPERA DINÁMICA ---
        // Si es error 429 (Throttling), esperamos más tiempo.
        // Sumamos un factor aleatorio (jitter) para evitar colisiones exactas.
        const isThrottling = errorMsg.includes("429") || errorMsg.includes("wait");
        const baseDelay = isThrottling ? 6000 : 3000; 
        const jitter = Math.floor(Math.random() * 1000);
        const delay = (baseDelay * (i + 1)) + jitter;

        console.warn(`⚠️ Intento ${i + 1} falló (${isThrottling ? 'Throttling' : 'Consistency'}). Reintentando en ${delay/1000}s...`);
        
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }
}
  /**
   * Confirma los datos (validados o corregidos por el usuario)
   */
  confirm() {
    if (!this.invoice.vendor || !this.invoice.total) {
      this.messageService.add({ 
        severity: 'warn', 
        summary: 'Datos incompletos', 
        detail: 'Por favor verifica el proveedor y el monto total.' 
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