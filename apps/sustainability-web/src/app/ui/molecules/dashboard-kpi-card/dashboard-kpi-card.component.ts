import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DashboardMetricLabelComponent } from '../../atoms/dashboard-metric-label/dashboard-metric-label.component';

@Component({
  selector: 'ui-dashboard-kpi-card',
  standalone: true,
  imports: [DashboardMetricLabelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-kpi-card.component.html',
  styleUrl: './dashboard-kpi-card.component.scss'
})
export class DashboardKpiCardComponent {
  @Input({ required: true }) label!: string;
  @Input() labelHint: string | null = null;
  @Input({ required: true }) primaryValue!: string;
  @Input() secondaryLine: string | null = null;
  @Input() trendLabel: string | null = null;
  @Input() trendPositive: boolean | null = null;
  /** Valores 30d para sparkline (kWh u otra magnitud). */
  @Input({ required: true }) sparkline!: readonly number[];

  sparkPath(): string {
    const vals = [...this.sparkline];
    if (vals.length < 2) return '';
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const w = 100;
    const h = 28;
    const step = w / (vals.length - 1);
    return vals
      .map((v, i) => {
        const x = i * step;
        const y = h - ((v - min) / span) * (h - 4) - 2;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }
}
