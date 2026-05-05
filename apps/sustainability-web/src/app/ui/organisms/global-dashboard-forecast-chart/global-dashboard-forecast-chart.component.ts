import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { GlobalDashboardStateService } from '../../../features/dashboard/services/global-dashboard-state.service';
import { buildForecastChartOption } from '../../../features/dashboard/lib/global-dashboard-chart-options';
import { EchartsNativePaneComponent } from '../echarts-native-pane/echarts-native-pane.component';
import { DashboardMetricLabelComponent } from '../../atoms/dashboard-metric-label/dashboard-metric-label.component';
import { DashboardLegendItemComponent } from '../../molecules/dashboard-legend-item/dashboard-legend-item.component';

@Component({
  selector: 'app-global-dashboard-forecast-chart',
  standalone: true,
  imports: [
    EchartsNativePaneComponent,
    DashboardMetricLabelComponent,
    DashboardLegendItemComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full min-w-0' },
  template: `
    <div class="flex flex-col gap-4 h-full min-h-0">
      <div class="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <ui-dashboard-metric-label
            text="Forecast de cierre (kWh acumulados)"
            hint="predictive_engine — P10 / P50 / P90"
          />
          <h3 class="text-sm font-black text-slate-900 uppercase tracking-wide mt-1 m-0">Capa predictiva</h3>
        </div>
        <div class="flex flex-wrap gap-4">
          <ui-dashboard-legend-item label="Real" color="#64748b" />
          <ui-dashboard-legend-item label="P50" color="#059669" />
          <ui-dashboard-legend-item label="Banda P10–P90" color="rgba(5,150,105,0.25)" />
        </div>
      </div>
      <div class="w-full h-[260px] rounded-xl border border-slate-200 bg-slate-50/80 p-2 overflow-hidden">
        @if (options(); as opts) {
          <app-echarts-native-pane [options]="opts" [hostHeightPx]="240" />
        }
      </div>
    </div>
  `
})
export class GlobalDashboardForecastChartComponent {
  private readonly svc = inject(GlobalDashboardStateService);

  readonly options = computed(() => buildForecastChartOption(this.svc.state()));
}
