import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'ui-search-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => UiSearchFieldComponent),
      multi: true
    }
  ],
  template: `
    <div
      class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20"
    >
      <span class="pi pi-search text-slate-400 text-sm" aria-hidden="true"></span>
      <input
        class="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
        type="search"
        [id]="inputId"
        [placeholder]="placeholder"
        [attr.aria-label]="ariaLabel"
        [ngModel]="value"
        (ngModelChange)="onInput($event)"
        (blur)="onTouched()"
      />
    </div>
  `
})
export class UiSearchFieldComponent implements ControlValueAccessor {
  @Input() inputId = '';
  @Input() placeholder = 'Search…';
  @Input() ariaLabel = 'Search';

  @Output() readonly submitted = new EventEmitter<string>();

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

  onInput(v: string): void {
    this.value = v;
    this.onChange(v);
  }
}
