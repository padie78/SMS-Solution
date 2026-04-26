import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Necesario para [(ngModel)]
import { Subscription } from 'rxjs';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';

// Core
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

  // --- PROPIEDADES QUE EL HTML NECESITA ---
  isLoading = true;
  invoice: any = null;
  errorMessage: string | null = null; // Fix para TS2339
  private statusSubscription?: Subscription;

  ngOnInit() {
    const { invoiceId, extractedData } = this.stateService.getSnapshot();

    if (extractedData) {
      this.invoice = extractedData;
      this.isLoading = false;
      return;
    }

    if (invoiceId) {
      this.subscribeToUpdates(invoiceId);
    } else {
      this.errorMessage = 'No se encontró una factura para validar.';
      this.isLoading = false;
    }
  }

  private subscribeToUpdates(id: string) {
    this.statusSubscription = this.appsyncService.onInvoiceUpdated(id).subscribe({
      next: ({ data }: any) => {
        const updatedInvoice = data.onInvoiceUpdated;
        if (updatedInvoice.status === 'READY') {
          this.invoice = typeof updatedInvoice.extractedData === 'string' 
            ? JSON.parse(updatedInvoice.extractedData) 
            : updatedInvoice.extractedData;
          this.stateService.setAiData(this.invoice);
          this.isLoading = false;
          this.statusSubscription?.unsubscribe();
        } 
        else if (updatedInvoice.status === 'FAILED') {
          this.isLoading = false;
          this.errorMessage = 'La IA no pudo procesar el documento.';
        }
      },
      error: (err) => {
        this.errorMessage = 'Error en la conexión con AppSync.';
        this.isLoading = false;
      }
    });
  }

  // --- MÉTODOS QUE EL HTML NECESITA ---
  
  goBack() { // Fix para TS2339 en (click)="goBack()"
    // Aquí podrías inyectar el Router y volver al step anterior
    console.log('Navegando hacia atrás...');
    window.history.back(); 
  }

  confirm() { // Fix para el botón de confirmar
    this.handleConfirm();
  }

  async handleConfirm() {
    console.log('Sincronizando factura...', this.invoice);
    // Tu lógica de llamada a appsyncService.confirmInvoice(...)
  }

  ngOnDestroy() {
    this.statusSubscription?.unsubscribe();
  }
}