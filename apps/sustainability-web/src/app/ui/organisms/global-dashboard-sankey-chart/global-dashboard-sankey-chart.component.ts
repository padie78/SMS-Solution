import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { buildSankeyChartOption } from '../../../features/dashboard/lib/global-dashboard-chart-options';
import { GlobalDashboardStateService } from '../../../features/dashboard/services/global-dashboard-state.service';
import { EchartsNativePaneComponent } from '../echarts-native-pane/echarts-native-pane.component';
import { DashboardMetricLabelComponent } from '../../atoms/dashboard-metric-label/dashboard-metric-label.component';

@Component({
  selector: 'app-global-dashboard-sankey-chart',
  standalone: true,
  imports: [EchartsNativePaneComponent, DashboardMetricLabelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full min-w-0' },
  template: `
    <section
      class="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 h-full flex flex-col gap-3 shadow-sm"
    >
      <div>
        <ui-dashboard-metric-label text="Balance de masas" hint="Pregunta #4 — medidor padre → submedidores → fugas" />
        <h3 class="text-sm font-black text-slate-900 uppercase tracking-wide mt-1 m-0">Capa operativa</h3>
      </div>
      <div class="w-full h-[260px] rounded-xl border border-slate-100 bg-slate-50/80 p-2 overflow-hidden">
        @if (options(); as opts) {
          <app-echarts-native-pane [options]="opts" [hostHeightPx]="240" />
        }
      </div>
    </section>
  `
})
export class GlobalDashboardSankeyChartComponent {
  private readonly svc = inject(GlobalDashboardStateService);
  readonly options = computed(() => buildSankeyChartOption(this.svc.state()));
}
