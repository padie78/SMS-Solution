import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-skeleton-line',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="ui-skeleton-line"
      [style.height.px]="height"
      [style.width]="width"
      role="presentation"
      aria-hidden="true"
    ></div>
  `
})
export class UiSkeletonLineComponent {
  @Input() height = 12;
  @Input() width: string | number = '100%';
}
