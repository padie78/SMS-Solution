import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG 
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-invoice-validation',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ButtonModule, 
    InputTextModule, 
    TagModule, 
    TooltipModule
  ],
  // CORRECCIÓN: El nombre debe coincidir con el archivo físico en la carpeta
  templateUrl: './validation.component.html', 
  styleUrls: ['./validation.component.css']
})
export class InvoiceValidationComponent {
  @Input() invoice: any = {
    total: 0,
    date: '',
    vendor: ''
  };
  
  @Output() onConfirm = new EventEmitter<any>();
  @Output() onBack = new EventEmitter<void>();

  confirm() {
    this.onConfirm.emit(this.invoice);
  }
}