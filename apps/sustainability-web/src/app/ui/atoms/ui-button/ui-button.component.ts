import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type UiButtonVariant = 'primary' | 'secondary' | 'ghost';

@Component({
  selector: 'ui-button',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [attr.type]="type"
      [disabled]="disabled"
      [class]="buttonClass"
      (click)="clicked.emit($event)"
    >
      <ng-content></ng-content>
    </button>
  `
})
export class UiButtonComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() variant: UiButtonVariant = 'primary';
  @Output() clicked = new EventEmitter<MouseEvent>();

  get buttonClass(): string {
    return `ui-button ui-button--${this.variant}`;
  }
}
