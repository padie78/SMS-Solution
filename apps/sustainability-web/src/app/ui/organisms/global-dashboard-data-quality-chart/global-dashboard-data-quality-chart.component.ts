import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { EchartsNativePaneComponent } from '../echarts-native-pane/echarts-native-pane.component';
import { DashboardMetricLabelComponent } from '../../atoms/dashboard-metric-label/dashboard-metric-label.component';
import { DashboardTemporalControlService } from '../../../features/dashboard/services/dashboard-temporal-control.service';
import { buildReliabilityTrendOption } from '../../../features/dashboard/lib/global-dashboard-chart-options';

@Component({
  selector: 'app-global-dashboard-data-quality-chart',
  standalone: true,
  imports: [EchartsNativePaneComponent, DashboardMetricLabelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full min-w-0' },
  template: `
    <section class="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 h-full flex flex-col gap-3 shadow-sm">
      <div>
        <ui-dashboard-metric-label
          text="Calidad del dato (Reliability)"
          hint="Pregunta #9 — % paquetes recibidos vs esperados"
        />
        <h3 class="text-sm font-black text-slate-900 uppercase tracking-wide mt-1 m-0">Auditoría</h3>
      </div>
      <div class="w-full h-[260px] rounded-xl border border-slate-100 bg-slate-50/80 p-2 overflow-hidden">
        @if (options(); as opts) {
          <app-echarts-native-pane [options]="opts" [hostHeightPx]="240" />
        }
      </div>
    </section>
  `
})
export class GlobalDashboardDataQualityChartComponent {
  private readonly temporal = inject(DashboardTemporalControlService);

  readonly options = computed(() => {
    const ctx = this.temporal.context();
    const rng = this.temporal.debugRng(this.temporal.debugSeed() ^ 0x991122);

    const labels =
      ctx.scale === 'DAY'
        ? Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}`)
        : ctx.scale === 'WEEK'
          ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
          : ctx.scale === 'MONTH'
            ? Array.from({ length: 12 }, (_, i) => `D${String(i * 2 + 1).padStart(2, '0')}`)
            : ctx.scale === 'QUARTER'
              ? ['M1', 'M2', 'M3']
              : ['Ene', 'Mar', 'May', 'Jul', 'Sep', 'Nov'];

    // Reutilizamos el builder line/area: series = "Consumo fantasma" pero con valores en %.
    const reliabilityPct = labels.map((_, i) => {
      const base = 96.5 - i * 0.15;
      const jitter = (rng() - 0.5) * 1.2;
      return Math.round(Math.max(90, Math.min(99.5, base + jitter)) * 10) / 10;
    });

    return buildReliabilityTrendOption({ labels, reliabilityPct });
  });
}

