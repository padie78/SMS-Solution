import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { buildTelemetryTimeSeriesOption } from '../../../features/iot-telemetry/lib/iot-telemetry-chart-options';
import { IotTelemetryStateService } from '../../../features/iot-telemetry/services/iot-telemetry-state.service';
import { DashboardLegendItemComponent } from '../../molecules/dashboard-legend-item/dashboard-legend-item.component';
import { DashboardMetricLabelComponent } from '../../atoms/dashboard-metric-label/dashboard-metric-label.component';
import { EchartsNativePaneComponent } from '../echarts-native-pane/echarts-native-pane.component';

@Component({
  selector: 'app-iot-telemetry-time-series-chart',
  standalone: true,
  imports: [EchartsNativePaneComponent, DashboardMetricLabelComponent, DashboardLegendItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-4 h-full min-h-0">
      <div class="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <ui-dashboard-metric-label
            text="Serie temporal (METER_LOGS)"
            hint="Sort key METER#DATE · dataZoom diagnóstico"
          />
          <h3 class="text-sm font-black text-slate-900 uppercase tracking-wide mt-1 m-0">
            Corriente y tensión
          </h3>
        </div>
        <div class="flex flex-wrap gap-4">
          <ui-dashboard-legend-item label="I (A)" color="#059669" />
          <ui-dashboard-legend-item label="V (V)" color="#2563eb" />
          <ui-dashboard-legend-item label="Proyección 60 min" color="#64748b" />
        </div>
      </div>
      <div
        class="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-2 overflow-hidden shadow-sm"
        style="height: 420px"
      >
        @if (options(); as opts) {
          <app-echarts-native-pane [options]="opts" [hostHeightPx]="404" />
        }
      </div>
    </div>
  `
})
export class IotTelemetryTimeSeriesChartComponent {
  private readonly svc = inject(IotTelemetryStateService);

  readonly options = computed(() => buildTelemetryTimeSeriesOption(this.svc.selectedAsset()));
}
