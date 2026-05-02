import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ui-form-field',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-1.5">
      <label
        *ngIf="label"
        class="text-[11px] font-bold uppercase tracking-wider text-slate-600"
        [attr.for]="forId"
      >
        {{ label }}
      </label>
      <ng-content></ng-content>
      <p
        *ngIf="error"
        class="text-xs font-medium text-red-600"
        [id]="errorId"
        role="alert"
      >
        {{ error }}
      </p>
    </div>
  `
})
export class UiFormFieldComponent {
  @Input() label = '';
  @Input() forId = '';
  @Input() error = '';
  @Input() errorId = '';
}
