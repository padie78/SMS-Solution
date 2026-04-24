import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricsStore } from './data-access/metrics.store';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, TableModule, CardModule, ButtonModule],
  template: `
    <div class="p-8 max-w-7xl mx-auto">
      <header class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold text-slate-800">Sustentabilidad SaaS2</h1>
        <p-button label="Actualizar" icon="pi pi-refresh" 
                  [loading]="store.isLoading()" (onClick)="store.loadMetrics()"></p-button>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <p-card header="Total CO2e" styleClass="shadow-sm border-t-4 border-eco-green">
          <p class="text-4xl font-mono text-eco-dark">{{ store.totalEmissions() | number }} kg</p>
        </p-card>
      </div>

      <p-card header="Detalle de Emisiones">
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
  `
})
export class DashboardComponent implements OnInit {
  readonly store = inject(MetricsStore);

  ngOnInit() {
    this.store.loadMetrics();
  }
}