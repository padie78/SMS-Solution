import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, type OnChanges, signal } from '@angular/core';
import { ReactiveFormsModule, type ValidationErrors } from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import {
  TARIFF_FIELD_GRID_CLASS,
  TARIFF_FORM_ENUM_OPTIONS,
  TARIFF_FORM_TABS,
  type TariffFormFieldDef,
  type TariffFormGroup,
  type TariffFormShape,
  type TariffFormTabDef,
  type TariffFormValue,
  type SelectOption
} from './tariff-form.config';

@Component({
  selector: 'sms-tariff-form',
  standalone: true,
  host: {
    class: 'block w-full min-w-0 box-border'
  },
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    InputTextareaModule,
    InputNumberModule,
    DropdownModule,
    CheckboxModule,
    CalendarModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tariff-form.component.html'
})
export class TariffFormComponent implements OnChanges {
  @Input({ required: true }) form!: TariffFormGroup;

  readonly tabs: ReadonlyArray<TariffFormTabDef> = TARIFF_FORM_TABS;
  readonly activeTabId = signal<string>(TARIFF_FORM_TABS[0]?.id ?? 'general');

  get controls(): TariffFormShape {
    return this.form.controls as TariffFormShape;
  }

  ngOnChanges(): void {
    if (!this.form) return;
    this.form.controls.orgId.disable({ emitEvent: false });
    this.form.controls.branchId.disable({ emitEvent: false });
  }

  gridClass(field: TariffFormFieldDef): string {
    return TARIFF_FIELD_GRID_CLASS[field.mdCols];
  }

  enumOptions(key: keyof typeof TARIFF_FORM_ENUM_OPTIONS | undefined): Array<SelectOption<string>> {
    if (!key) return [];
    return [...TARIFF_FORM_ENUM_OPTIONS[key]] as SelectOption<string>[];
  }

  selectTab(id: string): void {
    this.activeTabId.set(id);
  }

  errorMessage<K extends keyof TariffFormValue>(key: K): string | null {
    const c = this.form.controls[key];
    const errs = c.errors as ValidationErrors | null;
    if (!errs) return null;
    if (errs['required']) return 'Campo obligatorio.';
    if (errs['min']) return `Valor mínimo: ${errs['min'].min}.`;
    if (errs['max']) return `Valor máximo: ${errs['max'].max}.`;
    if (errs['maxlength']) return `Máximo ${errs['maxlength'].requiredLength} caracteres.`;
    if (errs['email']) return 'Email inválido.';
    return null;
  }
}
