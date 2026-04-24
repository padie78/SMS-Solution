import { Component, Output, EventEmitter, Input } from '@angular/core'; // <-- Core, no Common
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-invoice-validation',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, ButtonModule, TagModule, TooltipModule],
  templateUrl: './validation.component.html',
  styleUrls: ['./validation.component.css']
})
export class InvoiceValidationComponent {
  @Output() onConfirm = new EventEmitter();
  @Output() onBack = new EventEmitter();

  // Mock de datos extraídos por la IA (Diego, aquí conectarás tu servicio de OCR)
  invoice = {
    total: 1500.50,
    date: '12/10/2023',
    provider: 'ENERGIA GLOBAL',
    description: 'Electrical Consumption - Main Plant'
  };

  confirm() {
    this.onConfirm.emit(this.invoice);
  }
}