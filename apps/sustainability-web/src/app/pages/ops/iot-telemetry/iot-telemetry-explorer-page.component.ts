import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { IotTelemetryStateService } from '../../../features/iot-telemetry/services/iot-telemetry-state.service';
import { DashboardKpiCardComponent } from '../../../ui/molecules/dashboard-kpi-card/dashboard-kpi-card.component';
import { IotTelemetryAssetRailComponent } from '../../../ui/organisms/iot-telemetry-asset-rail/iot-telemetry-asset-rail.component';
import { IotTelemetryTimeSeriesChartComponent } from '../../../ui/organisms/iot-telemetry-time-series-chart/iot-telemetry-time-series-chart.component';

@Component({
  selector: 'app-iot-telemetry-explorer-page',
  standalone: true,
  imports: [
    ButtonModule,
    DashboardKpiCardComponent,
    IotTelemetryAssetRailComponent,
    IotTelemetryTimeSeriesChartComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="iot-telemetry-root max-w-[1600px] mx-auto space-y-6 pb-12">
      <header class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="text-xs font-bold text-emerald-700 m-0">SMS · Live Operations</p>
          <h1 class="text-3xl font-black text-slate-900 tracking-tight mt-1 m-0">IoT Telemetry Explorer</h1>
          <p class="text-slate-500 text-sm max-w-3xl leading-relaxed mt-2 m-0">
            Capa <strong class="text-slate-700">descriptiva</strong> técnica: lecturas crudas alineadas a
            <span class="font-mono text-slate-600">METER#DATE</span>, umbrales dinámicos y proyección corta (60 min).
            Misma estética que el Dashboard ejecutivo.
          </p>
        </div>
        <div class="flex flex-wrap gap-2 items-center justify-end shrink-0">
          <span
            class="text-xs font-mono text-slate-500 hidden sm:inline border border-slate-200 rounded-lg px-2 py-1 bg-white"
          >
            {{ selected().id }}
          </span>
          <p-button
            label="Refrescar"
            icon="pi pi-refresh"
            [outlined]="true"
            (onClick)="refresh()"
            styleClass="p-button-outlined rounded-xl text-xs font-bold"
          />
        </div>
      </header>

      <!-- Tailwind grid: mismo ritmo que Global Dashboard (evita choque con la clase grid de PrimeFlex). -->
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-3">
        <div class="xl:col-span-3 order-2 xl:order-1 min-w-0">
          <div class="xl:sticky xl:top-4" style="max-height: min(720px, calc(100vh - 7rem))">
            <app-iot-telemetry-asset-rail class="block h-full" />
          </div>
        </div>
        <div class="xl:col-span-9 order-1 xl:order-2 space-y-6 min-w-0">
          <section class="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 md:p-6">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-600 m-0 mb-4">Integridad y canal</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
              <ui-dashboard-kpi-card
                label="Reliability score"
                labelHint="Integridad METER_LOGS"
                [primaryValue]="kpiReliability()"
                secondaryLine="Telemetría vs ventana actual"
                trendLabel="Estable vs objetivo 97%"
                [trendPositive]="state().reliability_score_pct >= 97"
                [sparkline]="state().sparkline"
              />
              <ui-dashboard-kpi-card
                label="Muestras / s"
                labelHint="Ingest pipeline"
                [primaryValue]="kpiSamples()"
                secondaryLine="Throughput agregado (mock)"
                trendLabel="Sin caídas en la ventana"
                [trendPositive]="true"
                [sparkline]="state().samples_sparkline"
              />
              <ui-dashboard-kpi-card
                label="Lag de ingestión"
                labelHint="ms p95 (mock)"
                [primaryValue]="kpiLag()"
                secondaryLine="DynamoDB → cliente"
                [trendLabel]="lagTrend()"
                [trendPositive]="state().ingest_lag_ms < 80"
                [sparkline]="state().lag_sparkline"
              />
            </div>
          </section>

          <section class="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-600 m-0 mb-4">Serie temporal</h2>
            <app-iot-telemetry-time-series-chart />
          </section>
        </div>
      </div>
    </div>
  `
})
export class IotTelemetryExplorerPageComponent {
  readonly telemetry = inject(IotTelemetryStateService);

  readonly state = this.telemetry.state;
  readonly selected = this.telemetry.selectedAsset;

  readonly kpiReliability = computed(() => `${this.state().reliability_score_pct.toFixed(1)}%`);
  readonly kpiSamples = computed(() => `${this.state().samples_per_sec.toFixed(1)} /s`);
  readonly kpiLag = computed(() => `${Math.round(this.state().ingest_lag_ms)} ms`);
  readonly lagTrend = computed(() => 'Objetivo < 80 ms');

  refresh(): void {
    this.telemetry.reloadMock();
  }
}
