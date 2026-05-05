import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { GlobalDashboardStateService } from '../../../features/dashboard/services/global-dashboard-state.service';
import { DashboardTemporalControlService } from '../../../features/dashboard/services/dashboard-temporal-control.service';
import { GlobalDashboardActionCenterComponent } from '../../organisms/global-dashboard-action-center/global-dashboard-action-center.component';
import { GlobalDashboardForecastChartComponent } from '../../organisms/global-dashboard-forecast-chart/global-dashboard-forecast-chart.component';
import { GlobalDashboardRadarChartComponent } from '../../organisms/global-dashboard-radar-chart/global-dashboard-radar-chart.component';
import { GlobalDashboardSankeyChartComponent } from '../../organisms/global-dashboard-sankey-chart/global-dashboard-sankey-chart.component';
import { DashboardKpiCardComponent } from '../../molecules/dashboard-kpi-card/dashboard-kpi-card.component';
import { ContextualHeaderComponent } from '../../organisms/contextual-header/contextual-header.component';
import { GlobalDashboardBenchmarkSitesChartComponent } from '../../organisms/global-dashboard-benchmark-sites-chart/global-dashboard-benchmark-sites-chart.component';
import { GlobalDashboardActiveIdleChartComponent } from '../../organisms/global-dashboard-active-idle-chart/global-dashboard-active-idle-chart.component';
import { GlobalDashboardPhantomConsumptionChartComponent } from '../../organisms/global-dashboard-phantom-consumption-chart/global-dashboard-phantom-consumption-chart.component';
import { GlobalDashboardDataQualityChartComponent } from '../../organisms/global-dashboard-data-quality-chart/global-dashboard-data-quality-chart.component';
import { GlobalDashboardEsgTraceabilityChartComponent } from '../../organisms/global-dashboard-esg-traceability-chart/global-dashboard-esg-traceability-chart.component';
import { DashboardLayerVisibilityService } from '../../../features/dashboard/services/dashboard-layer-visibility.service';

@Component({
  selector: 'app-global-dashboard-layout',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    DashboardKpiCardComponent,
    ContextualHeaderComponent,
    GlobalDashboardActionCenterComponent,
    GlobalDashboardForecastChartComponent,
    GlobalDashboardRadarChartComponent,
    GlobalDashboardSankeyChartComponent,
    GlobalDashboardBenchmarkSitesChartComponent,
    GlobalDashboardActiveIdleChartComponent,
    GlobalDashboardPhantomConsumptionChartComponent,
    GlobalDashboardDataQualityChartComponent,
    GlobalDashboardEsgTraceabilityChartComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './global-dashboard-layout.component.html',
  styleUrl: './global-dashboard-layout.component.scss'
})
export class GlobalDashboardLayoutComponent {
  readonly svc = inject(GlobalDashboardStateService);
  readonly temporal = inject(DashboardTemporalControlService);
  readonly layers = inject(DashboardLayerVisibilityService);

  readonly stats = computed(() => this.svc.state().stats);
  readonly predictive = computed(() => this.svc.state().predictive);
  readonly aiActions = computed(() => this.svc.state().ai_actions);

  readonly kpiReliabilityPrimary = computed(() => `${this.stats().reliability_score_pct.toFixed(1)}%`);
  readonly kpiConsumptionPrimary = computed(
    () => `${this.stats().total_kwh.toLocaleString('es-ES')} kWh`
  );
  readonly kpiConsumptionSecondary = computed(
    () => `Presupuesto ${this.stats().budget_kwh.toLocaleString('es-ES')} kWh`
  );
  readonly kpiConsumptionTrend = computed(() => {
    // Interpreta el "presupuesto" como baseline; la variación temporal real se modela en el servicio temporal.
    const v = ((this.stats().total_kwh - this.stats().budget_kwh) / this.stats().budget_kwh) * 100;
    const rounded = v.toFixed(1);
    return `${v <= 0 ? '' : '+'}${rounded}% vs presupuesto energético`;
  });
  readonly kpiConsumptionTrendPositive = computed(() => this.stats().total_kwh <= this.stats().budget_kwh);

  readonly kpiCarbonPrimary = computed(() => {
    const i = this.stats().ghg_kg_co2e / this.stats().floor_area_m2;
    return `${i.toFixed(2)} kg/m²`;
  });
  readonly kpiCarbonSecondary = computed(
    () => `${this.stats().ghg_kg_co2e.toLocaleString('es-ES')} kg CO₂e · ${this.stats().floor_area_m2.toLocaleString('es-ES')} m²`
  );

  readonly kpiSpendPrimary = computed(() =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
      this.stats().total_spend_usd
    )
  );
  readonly kpiSpendTrend = computed(() => {
    const v = ((this.stats().total_spend_usd - this.stats().budget_spend_usd) / this.stats().budget_spend_usd) * 100;
    const rounded = v.toFixed(1);
    return `${v <= 0 ? '' : '+'}${rounded}% vs budget (USD)`;
  });
  readonly kpiSpendTrendPositive = computed(() => this.stats().total_spend_usd <= this.stats().budget_spend_usd);

  readonly kpiProcrastinationPrimary = computed(() =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
      this.predictive().procrastination_cost_usd_weekly
    )
  );
  readonly kpiPendingActions = computed(
    () => this.aiActions().filter((a) => a.status === 'PENDING').length
  );

  readonly kpiBudgetBurnPrimary = computed(() => `${Math.round(this.predictive().budget_exceed_probability * 100)}%`);

  refresh(): void {
    this.svc.reloadFromUpstream();
  }
}
