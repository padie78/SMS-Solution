import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type DashboardImpactTone = 'emerald' | 'amber' | 'zinc';

@Component({
  selector: 'ui-dashboard-impact-badge',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border"
      [ngClass]="classes"
    >
      <i [class]="iconClass" aria-hidden="true"></i>
      <ng-content></ng-content>
    </span>
  `
})
export class DashboardImpactBadgeComponent {
  @Input({ required: true }) tone!: DashboardImpactTone;
  @Input() icon = 'pi-bolt';

  get iconClass(): string {
    return `pi ${this.icon} text-[9px]`;
  }

  get classes(): string {
    switch (this.tone) {
      case 'emerald':
        return 'border-emerald-200 bg-emerald-50 text-emerald-800';
      case 'amber':
        return 'border-amber-200 bg-amber-50 text-amber-800';
      case 'zinc':
      default:
        return 'border-slate-200 bg-slate-100 text-slate-600';
    }
  }
}
