import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { TrendDirection, TrendSemantic } from '../../../core/models/incident-center.model';

@Component({
  selector: 'ui-trend-badge',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="inline-flex items-center gap-1 rounded-md px-2 py-1 bg-slate-50 border border-slate-200"
    >
      <i [class]="iconClass" aria-hidden="true"></i>
      <span [class]="textClass" class="text-xs font-bold font-mono">{{ percent | number: '1.0-1' }}%</span>
    </div>
  `
})
export class UiTrendBadgeComponent {
  @Input({ required: true }) percent!: number;
  @Input({ required: true }) direction!: TrendDirection;
  @Input({ required: true }) semantic!: TrendSemantic;

  get iconClass(): string {
    const base = this.direction === 'up' ? 'pi pi-arrow-up' : 'pi pi-arrow-down';
    return `${base} text-xs`;
  }

  get textClass(): string {
    if (this.semantic === 'favorable') {
      return 'text-green-500';
    }
    return 'text-red-500';
  }
}
