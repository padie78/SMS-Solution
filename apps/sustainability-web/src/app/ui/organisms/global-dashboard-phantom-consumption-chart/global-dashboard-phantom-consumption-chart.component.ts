import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { EchartsNativePaneComponent } from '../echarts-native-pane/echarts-native-pane.component';
import { DashboardMetricLabelComponent } from '../../atoms/dashboard-metric-label/dashboard-metric-label.component';
import { DashboardTemporalControlService } from '../../../features/dashboard/services/dashboard-temporal-control.service';
import { buildPhantomConsumptionOption } from '../../../features/dashboard/lib/global-dashboard-chart-options';

@Component({
  selector: 'app-global-dashboard-phantom-consumption-chart',
  standalone: true,
  imports: [EchartsNativePaneComponent, DashboardMetricLabelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full min-w-0' },
  template: `
    <section class="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 h-full flex flex-col gap-3 shadow-sm">
      <div>
        <ui-dashboard-metric-label
          text="Consumo fantasma (fuera de horario)"
          hint="Pregunta #14 — kWh cuando la ubicación está CLOSED"
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
export class GlobalDashboardPhantomConsumptionChartComponent {
  private readonly temporal = inject(DashboardTemporalControlService);

  readonly options = computed(() => {
    const ctx = this.temporal.context();
    const seed = this.temporal.debugSeed();
    const rng = this.temporal.debugRng(seed ^ 0x778899);

    const labels =
      ctx.scale === 'DAY'
        ? Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}`)
        : ctx.scale === 'WEEK'
          ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
          : ctx.scale === 'MONTH'
            ? Array.from({ length: 10 }, (_, i) => `D${String(i + 1).padStart(2, '0')}`)
            : ctx.scale === 'QUARTER'
              ? ['M1', 'M2', 'M3']
              : ['Ene', 'Abr', 'Jul', 'Oct'];

    const phantomKwh = labels.map((_, i) => {
      const base = ctx.scale === 'DAY' ? 6 : ctx.scale === 'WEEK' ? 42 : ctx.scale === 'MONTH' ? 55 : ctx.scale === 'QUARTER' ? 120 : 180;
      const spike = i % 7 === 0 ? 1.6 : 1.0;
      return Math.round((base * spike + (rng() - 0.5) * base * 0.35) * 10) / 10;
    });

    return buildPhantomConsumptionOption({ labels, phantomKwh });
  });
}

