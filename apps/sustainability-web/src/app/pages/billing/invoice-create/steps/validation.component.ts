import { Component, Output, EventEmitter, Input } from '@angular/core'; // Agregamos Input
// ... otras importaciones

@Component({
  selector: 'app-invoice-validation',
  standalone: true,
  imports: [/* ... tus imports ... */],
  templateUrl: './validation.component.html',
  styleUrls: ['./validation.component.css']
})
export class InvoiceValidationComponent {
  // AGREGAR ESTA LÍNEA:
  @Input() invoice: any = { total: 0, date: '', provider: '' }; 

  @Output() onConfirm = new EventEmitter();
  @Output() onBack = new EventEmitter();

  confirm() {
    this.onConfirm.emit(this.invoice);
  }
}