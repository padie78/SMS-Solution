import { ChangeDetectionStrategy, Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'ui-text-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiTextInputComponent),
      multi: true
    }
  ],
  template: `
    <input
      class="ui-text-input"
      [class.ui-text-input--invalid]="invalid"
      [id]="inputId"
      [attr.name]="name"
      [type]="type"
      [placeholder]="placeholder"
      [disabled]="disabled"
      [attr.aria-invalid]="invalid ? 'true' : 'false'"
      [attr.aria-describedby]="describedBy || null"
      [ngModel]="value"
      (ngModelChange)="onInput($event)"
      (blur)="onTouched()"
    />
  `
})
export class UiTextInputComponent implements ControlValueAccessor {
  @Input() inputId = '';
  @Input() name = '';
  @Input() type: 'text' | 'search' | 'email' = 'text';
  @Input() placeholder = '';
  @Input() disabled = false;
  @Input() invalid = false;
  @Input() describedBy = '';

  value = '';

  private onChange: (v: string) => void = () => undefined;
  onTouched: () => void = () => undefined;

  writeValue(v: string | null): void {
    this.value = v ?? '';
  }

  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(v: string): void {
    this.value = v;
    this.onChange(v);
  }
}
