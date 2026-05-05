import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { EchartsNativePaneComponent } from '../echarts-native-pane/echarts-native-pane.component';
import { DashboardMetricLabelComponent } from '../../atoms/dashboard-metric-label/dashboard-metric-label.component';
import { DashboardTemporalControlService } from '../../../features/dashboard/services/dashboard-temporal-control.service';
import { buildBenchmarkSitesOption } from '../../../features/dashboard/lib/global-dashboard-chart-options';

@Component({
  selector: 'app-global-dashboard-benchmark-sites-chart',
  standalone: true,
  imports: [EchartsNativePaneComponent, DashboardMetricLabelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full min-w-0' },
  template: `
    <section class="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 h-full flex flex-col gap-3 shadow-sm">
      <div>
        <ui-dashboard-metric-label
          text="Benchmarking entre sedes"
          hint="Pregunta #3 — kWh del periodo / m² (energy_intensity)"
        />
        <h3 class="text-sm font-black text-slate-900 uppercase tracking-wide mt-1 m-0">Capa descriptiva</h3>
      </div>
      <div class="w-full h-[260px] rounded-xl border border-slate-100 bg-slate-50/80 p-2 overflow-hidden">
        @if (options(); as opts) {
          <app-echarts-native-pane [options]="opts" [hostHeightPx]="240" />
        }
      </div>
    </section>
  `
})
export class GlobalDashboardBenchmarkSitesChartComponent {
  private readonly temporal = inject(DashboardTemporalControlService);

  readonly options = computed(() => {
    const ctx = this.temporal.context();
    const seed = this.temporal.debugSeed();
    const rng = this.temporal.debugRng(seed ^ 0x55aa33);
    const sites = ['Planta A', 'Planta B', 'Logística', 'HQ'];
    const base = ctx.scale === 'DAY' ? 2.6 : ctx.scale === 'WEEK' ? 14 : ctx.scale === 'MONTH' ? 58 : ctx.scale === 'QUARTER' ? 165 : 690;
    const siteValues = sites.map((site, i) => ({
      site,
      kwhPerM2: Math.round((base + (i - 1.5) * 6 + (rng() - 0.5) * 8) * 10) / 10
    }));
    return buildBenchmarkSitesOption({ scale: ctx.scale, labels: [], siteValues });
  });
}

