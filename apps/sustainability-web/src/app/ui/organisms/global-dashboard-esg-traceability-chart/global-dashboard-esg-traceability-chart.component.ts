import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { EchartsNativePaneComponent } from '../echarts-native-pane/echarts-native-pane.component';
import { DashboardMetricLabelComponent } from '../../atoms/dashboard-metric-label/dashboard-metric-label.component';
import { DashboardTemporalControlService } from '../../../features/dashboard/services/dashboard-temporal-control.service';
import type { EChartsOption } from 'echarts';

@Component({
  selector: 'app-global-dashboard-esg-traceability-chart',
  standalone: true,
  imports: [EchartsNativePaneComponent, DashboardMetricLabelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full min-w-0' },
  template: `
    <section class="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 h-full flex flex-col gap-3 shadow-sm">
      <div>
        <ui-dashboard-metric-label
          text="Trazabilidad ESG / CO₂e"
          hint="Pregunta #6 — consumo × factor regional vigente"
        />
        <h3 class="text-sm font-black text-slate-900 uppercase tracking-wide mt-1 m-0">ESG</h3>
      </div>
      <div class="w-full h-[260px] rounded-xl border border-slate-100 bg-slate-50/80 p-2 overflow-hidden">
        @if (options(); as opts) {
          <app-echarts-native-pane [options]="opts" [hostHeightPx]="240" />
        }
      </div>
    </section>
  `
})
export class GlobalDashboardEsgTraceabilityChartComponent {
  private readonly temporal = inject(DashboardTemporalControlService);

  readonly options = computed((): EChartsOption => {
    const rng = this.temporal.debugRng(this.temporal.debugSeed() ^ 0x334455);
    // Ficticio: composición de CO2e por fuente (grid/solar/backup) para explicar trazabilidad.
    const grid = 70 + (rng() - 0.5) * 10;
    const solar = 18 + (rng() - 0.5) * 6;
    const backup = Math.max(2, 100 - grid - solar);

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      // En cards compactas, la leyenda interna puede tapar el pie.
      legend: { show: false },
      series: [
        {
          name: 'CO₂e',
          type: 'pie',
          center: ['50%', '52%'],
          radius: ['55%', '78%'],
          avoidLabelOverlap: true,
          label: { color: '#334155', fontSize: 11, formatter: '{b}: {d}%' },
          labelLine: { length: 10, length2: 10 },
          data: [
            { value: Math.round(grid), name: 'Grid (factor regional)' },
            { value: Math.round(solar), name: 'Autogeneración' },
            { value: Math.round(backup), name: 'Backup / Diesel' }
          ],
          itemStyle: {
            borderRadius: 10,
            borderColor: 'rgba(248,250,252,0.9)',
            borderWidth: 2
          },
          color: ['#059669', '#0ea5e9', '#d97706']
        }
      ]
    } as EChartsOption;
  });
}

