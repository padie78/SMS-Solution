import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-heading',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 *ngIf="level === 1" [id]="id" class="ui-heading ui-heading--h1">{{ text }}<ng-content></ng-content></h1>
    <h2 *ngIf="level === 2" [id]="id" class="ui-heading ui-heading--h2">{{ text }}<ng-content></ng-content></h2>
    <h3 *ngIf="level === 3" [id]="id" class="ui-heading ui-heading--h3">{{ text }}<ng-content></ng-content></h3>
    <h4 *ngIf="level === 4" [id]="id" class="ui-heading ui-heading--h4">{{ text }}<ng-content></ng-content></h4>
  `
})
export class UiHeadingComponent {
  @Input() level: 1 | 2 | 3 | 4 = 2;
  @Input() text = '';
  @Input() id = '';
}
