import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'ui-metric-atom',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-1">
      @if (caption) {
        <span class="text-[11px] text-slate-500 font-black uppercase tracking-wider">{{ caption }}</span>
      }
      <div class="flex flex-row items-baseline gap-1 flex-wrap">
        <span class="text-2xl font-black text-slate-900 font-mono leading-none tracking-tight">
          @if (textValue !== null && textValue !== undefined) {
            {{ textValue }}
          } @else if (numericValue !== null && numericValue !== undefined) {
            {{ numericValue | number: digitInfo }}
          } @else {
            —
          }
        </span>
        <sub class="text-sm text-slate-500 font-normal m-0 leading-none">{{ unit }}</sub>
      </div>
    </div>
  `
})
export class UiMetricAtomComponent {
  @Input() numericValue: number | null = null;
  @Input() digitInfo = '1.0-2';
  @Input() textValue: string | null = null;
  @Input({ required: true }) unit!: string;
  @Input() caption: string | null = null;
}
