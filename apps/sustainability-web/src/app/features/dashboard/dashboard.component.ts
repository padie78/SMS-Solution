import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricsStore } from './data-access/metrics.store';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { UiSkeletonLineComponent } from '../../ui/atoms/ui-skeleton-line/ui-skeleton-line.component';
import { UiHeadingComponent } from '../../ui/atoms/ui-heading/ui-heading.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    CardModule,
    ButtonModule,
    UiSkeletonLineComponent,
    UiHeadingComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-7xl mx-auto space-y-8">
      <header class="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <ui-heading [level]="1" text="Sustainability overview"></ui-heading>
        <p-button
          label="Actualizar"
          icon="pi pi-refresh"
          [loading]="store.isLoading()"
          (onClick)="store.loadMetrics()"
          styleClass="rounded-xl shadow-sm"
        ></p-button>
      </header>

      <div *ngIf="store.isLoading() && store.emissions().length === 0" class="space-y-6" aria-busy="true">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            *ngFor="let _ of [1, 2, 3]"
            class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3"
          >
            <ui-skeleton-line [height]="12" width="40%"></ui-skeleton-line>
            <ui-skeleton-line [height]="36" width="70%"></ui-skeleton-line>
          </div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <ui-skeleton-line [height]="14" width="220px"></ui-skeleton-line>
          <ui-skeleton-line *ngFor="let __ of [1, 2, 3, 4]" [height]="40" width="100%"></ui-skeleton-line>
        </div>
      </div>

      <div *ngIf="!(store.isLoading() && store.emissions().length === 0)" class="space-y-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <p-card header="Total CO2e" styleClass="shadow-sm border border-slate-200 rounded-xl overflow-hidden">
            <p class="text-4xl font-mono text-eco-dark">{{ store.totalEmissions() | number }} kg</p>
          </p-card>
        </div>

        <p-card
          header="Detalle de Emisiones"
          styleClass="shadow-sm border border-slate-200 rounded-xl overflow-hidden"
        >
          <p-table [value]="store.emissions()" [loading]="store.isLoading()" responsiveLayout="scroll">
            <ng-template pTemplate="header">
              <tr>
                <th>Fuente</th>
                <th>Valor</th>
                <th>Unidad</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-m>
              <tr>
                <td>{{ m.source }}</td>
                <td class="font-bold">{{ m.value }}</td>
                <td>{{ m.unit }}</td>
              </tr>
            </ng-template>
          </p-table>
        </p-card>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  readonly store = inject(MetricsStore);

  ngOnInit(): void {
    void this.store.loadMetrics();
  }
}
