import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, type OnChanges, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { LocationFormFieldComponent } from './location-form-field.component';
import {
  TARIFF_FORM_ENUM_OPTIONS,
  TARIFF_FORM_TABS,
  type TariffFormGroup,
  type TariffFormShape,
  type TariffFormTabDef,
  type SelectOption
} from './tariff-form.config';

@Component({
  selector: 'sms-tariff-form',
  standalone: true,
  host: {
    class: 'block w-full min-w-0 box-border'
  },
  imports: [CommonModule, ReactiveFormsModule, LocationFormFieldComponent],
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

  enumOptions(key: keyof typeof TARIFF_FORM_ENUM_OPTIONS | undefined): Array<SelectOption<string>> {
    if (!key) return [];
    return [...TARIFF_FORM_ENUM_OPTIONS[key]] as SelectOption<string>[];
  }

  selectTab(id: string): void {
    this.activeTabId.set(id);
  }
}
