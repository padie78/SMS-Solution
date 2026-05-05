import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'ui-dashboard-legend-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-2 text-[11px] text-slate-600">
      <span class="h-2 w-2 rounded-sm shrink-0 border border-slate-300" [style.background]="color"></span>
      <span class="font-semibold">{{ label }}</span>
    </div>
  `
})
export class DashboardLegendItemComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) color!: string;
}
