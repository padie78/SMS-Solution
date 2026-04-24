import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';

@Component({
  selector: 'app-invoice-manager',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule],
  templateUrl: './invoice-manager.component.html',
  styleUrls: ['./invoice-manager.component.css']
})
export class InvoiceManagerComponent {
  invoices = [
    { id: 'INV-001', provider: 'Energia Global', date: '12/10/2023', amount: 1500.50, status: 'PROCESSED' },
    { id: 'INV-002', provider: 'Green Power Co.', date: '15/10/2023', amount: 2300.00, status: 'PENDING' },
    { id: 'INV-003', provider: 'Solar Solutions', date: '20/10/2023', amount: 1200.75, status: 'PROCESSED' },
    { id: 'INV-004', provider: 'Wind Energy Inc.', date: '25/10/2023', amount: 1800.00, status: 'PENDING' } 
  ];

  constructor(private router: Router) {}

  navToCreate() {
    this.router.navigate(['/billing/invoices/new']);
  }
}