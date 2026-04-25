import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-invoice-validation',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule, TagModule, TooltipModule],
  templateUrl: './invoice-validation.component.html',
  styleUrls: ['./invoice-validation.component.css']
})
export class InvoiceValidationComponent {
  @Input() invoice: any = {
    total: 1250.45,
    date: '2026-04-15',
    vendor: 'ENERGIA GLOBAL'
  };
  @Output() onConfirm = new EventEmitter<any>();
  @Output() onBack = new EventEmitter<void>();

  confirm() {
    this.onConfirm.emit(this.invoice);
  }
}