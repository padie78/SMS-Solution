import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type UiBadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'ui-badge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="classes" role="status">
      <ng-content></ng-content>
    </span>
  `
})
export class UiBadgeComponent {
  @Input() tone: UiBadgeTone = 'neutral';

  get classes(): string {
    return `ui-badge ui-badge--${this.tone}`;
  }
}
