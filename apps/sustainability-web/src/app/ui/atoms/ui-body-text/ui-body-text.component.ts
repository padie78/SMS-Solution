import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-body-text',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="ui-body-text" [class.ui-body-text--muted]="muted">
      <ng-content></ng-content>
    </p>
  `
})
export class UiBodyTextComponent {
  @Input() muted = false;
}
