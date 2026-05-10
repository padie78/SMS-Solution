import { ChangeDetectionStrategy, Component, forwardRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { InputSwitchModule } from 'primeng/inputswitch';

/**
 * Átomo de switch booleano para formularios.
 *
 * Encapsula PrimeNG `p-inputSwitch` con el estilo visual SMS:
 * - switch visible y esmeralda al estar activo,
 * - label legible,
 * - texto de ayuda inline para explicar el objetivo del toggle.
 *
 * Implementa `ControlValueAccessor`, por eso puede usarse con `formControlName`.
 */
@Component({
  selector: 'ui-input-switch',
  standalone: true,
  imports: [CommonModule, FormsModule, InputSwitchModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiInputSwitchComponent),
      multi: true
    }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full'
  },
  template: `
    <label
      class="group flex h-full w-full cursor-pointer items-start gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 transition-colors hover:border-emerald-300/80 hover:bg-emerald-50/40"
      [class.cursor-not-allowed]="isDisabled"
      [class.opacity-70]="isDisabled"
      [attr.for]="inputId"
    >
      <p-inputSwitch
        class="mt-0.5 shrink-0"
        [inputId]="inputId"
        [ngModel]="value"
        [disabled]="isDisabled"
        [attr.aria-label]="ariaLabel ?? label"
        (onChange)="onSwitchChange($event.checked)"
        (onBlur)="markTouched()"
      />
      <span class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="text-sm font-semibold text-slate-800">{{ label }}</span>
        @if (helpText) {
          <span class="text-xs leading-snug text-slate-500">{{ helpText }}</span>
        }
      </span>
    </label>
  `
})
export class UiInputSwitchComponent implements ControlValueAccessor {
  @Input({ required: true }) inputId!: string;
  @Input({ required: true }) label!: string;
  @Input() helpText: string | null | undefined = '';
  @Input() ariaLabel?: string;
  /**
   * Deshabilita el switch visualmente. No uses el nombre `disabled` en el host junto a
   * `formControlName`: Angular emite el aviso “disabled con reactive form directive”.
   */
  @Input() inputReadonly = false;

  value = false;
  private cvaDisabled = false;
  private onChange: (value: boolean) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  get isDisabled(): boolean {
    return this.inputReadonly || this.cvaDisabled;
  }

  writeValue(value: unknown): void {
    this.value = value === true;
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.cvaDisabled = isDisabled;
  }

  onSwitchChange(checked: boolean): void {
    this.value = checked;
    this.onChange(checked);
    this.markTouched();
  }

  markTouched(): void {
    this.onTouched();
  }
}
