import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import type { InvoiceAdminRow, InvoiceAdminStats } from '../../../core/models/invoice-onboarding.model';
import { MOCK_ADMIN_INVOICES } from '../../../features/invoice-onboarding/data/invoice-onboarding.mock';
import { LoadingService } from '../../../services/ui/loading.service';
import { UiSkeletonLineComponent } from '../../../ui/atoms/ui-skeleton-line/ui-skeleton-line.component';

interface FilterOption {
  readonly label: string;
  readonly value: string;
}

@Component({
  selector: 'app-invoice-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    CardModule,
    DropdownModule,
    UiSkeletonLineComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invoice-manager.component.html'
})
export class InvoiceManagerComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly loading = inject(LoadingService);

  readonly allRows = signal<InvoiceAdminRow[]>([]);
  readonly initialLoad = signal(true);

  readonly siteFilter = signal<string>('ALL');
  readonly serviceFilter = signal<string>('ALL');
  readonly dateFrom = signal<string>('');
  readonly dateTo = signal<string>('');

  readonly skeletonRows = [1, 2, 3, 4, 5] as const;

  readonly siteOptions = signal<FilterOption[]>([{ label: 'Todas las sedes', value: 'ALL' }]);
  readonly serviceTypeOptions: FilterOption[] = [
    { label: 'Todos los servicios', value: 'ALL' },
    { label: 'Electricidad', value: 'ELECTRICITY' },
    { label: 'Agua', value: 'WATER' },
    { label: 'Gas', value: 'GAS' }
  ];

  readonly stats = computed((): InvoiceAdminStats => {
    const rows = this.allRows();
    const billed = rows.reduce((a, r) => a + r.amount, 0);
    const pending = rows.filter((r) => r.status === 'PENDING').length;
    const co2 = Math.round(rows.reduce((a, r) => a + r.amount * 0.00028, 0));
    return {
      billedMonthEur: billed,
      co2eMonthKg: co2,
      pendingReviewCount: pending,
      pctVsPriorMonth: -2.4
    };
  });

  readonly filteredRows = computed(() => {
    const rows = this.allRows();
    const site = this.siteFilter();
    const svc = this.serviceFilter();
    const from = this.dateFrom();
    const to = this.dateTo();
    return rows.filter((r) => {
      if (site !== 'ALL' && r.site !== site) return false;
      if (svc !== 'ALL' && r.serviceType !== svc) return false;
      if (from && r.dateIso < from) return false;
      if (to && r.dateIso > to) return false;
      return true;
    });
  });

  ngOnInit(): void {
    void this.loading.track(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 400));
      const rows = [...MOCK_ADMIN_INVOICES];
      this.allRows.set(rows);
      const sites = new Set(rows.map((r) => r.site));
      const opts: FilterOption[] = [
        { label: 'Todas las sedes', value: 'ALL' },
        ...[...sites].sort().map((s) => ({ label: s, value: s }))
      ];
      this.siteOptions.set(opts);
      this.initialLoad.set(false);
    });
  }

  navToCreate(): void {
    void this.router.navigate(['/compliance/invoices/new']);
  }

  statusLabel(s: InvoiceAdminRow['status']): string {
    switch (s) {
      case 'VALIDATED':
        return 'Validada';
      case 'PENDING':
        return 'Pendiente';
      case 'FLAGGED':
        return 'Observada';
      default:
        return s;
    }
  }

  serviceLabel(t: InvoiceAdminRow['serviceType']): string {
    switch (t) {
      case 'ELECTRICITY':
        return 'Electricidad';
      case 'WATER':
        return 'Agua';
      case 'GAS':
        return 'Gas';
      default:
        return t;
    }
  }
}
