import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'ui-dashboard-metric-label',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="block text-[10px] font-bold uppercase tracking-wider text-slate-500"
      [attr.title]="hint ?? null"
    >
      {{ text }}
    </span>
  `
})
export class DashboardMetricLabelComponent {
  @Input({ required: true }) text!: string;
  @Input() hint: string | null = null;
}
