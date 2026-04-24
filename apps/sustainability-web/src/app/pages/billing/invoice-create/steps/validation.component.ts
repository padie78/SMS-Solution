import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common'; // Necesario para el pipe 'currency'
import { FormsModule } from '@angular/forms'; // Necesario para '[(ngModel)]'

// PrimeNG Imports (Deben estar aquí para ser reconocidos en el HTML)
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button'; // Necesario para 'p-button'
import { TagModule } from 'primeng/tag'; // Necesario para 'p-tag'
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-invoice-validation',
  standalone: true,
  imports: [
    CommonModule,     // Resuelve el error de 'currency' pipe
    FormsModule,      // Resuelve el error de 'ngModel'
    InputTextModule,
    ButtonModule,     // Resuelve el error de 'p-button'
    TagModule,        // Resuelve el error de 'p-tag'
    TooltipModule
  ],
  templateUrl: './validation.component.html',
  styleUrls: ['./validation.component.css']
})
export class InvoiceValidationComponent {
  @Input() invoice: any = { total: 0, date: '', provider: '' }; 

  @Output() onConfirm = new EventEmitter();
  @Output() onBack = new EventEmitter();

  confirm() {
    this.onConfirm.emit(this.invoice);
  }
}