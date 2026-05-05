import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { EchartsNativePaneComponent } from '../echarts-native-pane/echarts-native-pane.component';
import { DashboardMetricLabelComponent } from '../../atoms/dashboard-metric-label/dashboard-metric-label.component';
import { DashboardTemporalControlService } from '../../../features/dashboard/services/dashboard-temporal-control.service';
import { buildActiveIdleOption } from '../../../features/dashboard/lib/global-dashboard-chart-options';

@Component({
  selector: 'app-global-dashboard-active-idle-chart',
  standalone: true,
  imports: [EchartsNativePaneComponent, DashboardMetricLabelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full min-w-0' },
  template: `
    <section class="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 h-full flex flex-col gap-3 shadow-sm">
      <div>
        <ui-dashboard-metric-label
          text="Energía productiva vs ociosa"
          hint="Pregunta #5 — ACTIVE vs IDLE en el rango temporal elegido"
        />
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
export class GlobalDashboardActiveIdleChartComponent {
  private readonly temporal = inject(DashboardTemporalControlService);

  readonly options = computed(() => {
    const ctx = this.temporal.context();
    const seed = this.temporal.debugSeed();
    const rng = this.temporal.debugRng(seed ^ 0x223344);

    const labels =
      ctx.scale === 'DAY'
        ? ['00–06', '06–12', '12–18', '18–24']
        : ctx.scale === 'WEEK'
          ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
          : ctx.scale === 'MONTH'
            ? ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4']
            : ctx.scale === 'QUARTER'
              ? ['M1', 'M2', 'M3']
              : ['Q1', 'Q2', 'Q3', 'Q4'];

    const activeKwh = labels.map((_, i) => Math.round(900 + i * 40 + rng() * 220));
    const idleKwh = labels.map((_, i) => Math.round(260 + (labels.length - i) * 18 + rng() * 140));
    return buildActiveIdleOption({ labels, activeKwh, idleKwh });
  });
}

