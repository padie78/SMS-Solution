import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { LoadingService } from '../../../services/ui/loading.service';
import { UiSkeletonLineComponent } from '../../../ui/atoms/ui-skeleton-line/ui-skeleton-line.component';

export interface InvoiceListRow {
  id: string;
  provider: string;
  date: string;
  amount: number;
  status: string;
}

@Component({
  selector: 'app-invoice-manager',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, UiSkeletonLineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invoice-manager.component.html',
  styleUrls: ['./invoice-manager.component.css']
})
export class InvoiceManagerComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly loading = inject(LoadingService);

  readonly invoices = signal<InvoiceListRow[]>([]);
  readonly initialLoad = signal(true);

  ngOnInit(): void {
    void this.loading.track(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 400));
      this.invoices.set([
        { id: 'INV-001', provider: 'Energia Global', date: '12/10/2023', amount: 1500.5, status: 'PROCESSED' },
        { id: 'INV-002', provider: 'Green Power Co.', date: '15/10/2023', amount: 2300.0, status: 'PENDING' },
        { id: 'INV-003', provider: 'Solar Solutions', date: '20/10/2023', amount: 1200.75, status: 'PROCESSED' },
        { id: 'INV-004', provider: 'Wind Energy Inc.', date: '25/10/2023', amount: 1800.0, status: 'PENDING' }
      ]);
      this.initialLoad.set(false);
    });
  }

  navToCreate(): void {
    void this.router.navigate(['/compliance/invoices/new']);
  }
}
