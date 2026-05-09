import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type OnInit,
  inject,
  signal
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, type ValidationErrors } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { CostCenterEntity, type CostCenterDTO } from '@sms/common';

import {
  COST_CENTER_FIELD_GRID_CLASS,
  COST_CENTER_FORM_ENUM_OPTIONS,
  COST_CENTER_FORM_TABS,
  buildCostCenterFormGroup,
  costCenterFormRawValueToDTO,
  hydrateCostCenterFormFromPartial,
  type CostCenterFormFieldDef,
  type CostCenterFormGroup,
  type CostCenterFormShape,
  type CostCenterFormValue,
  type SelectOption
} from './cost-center-form.config';

export interface OrganizationCostCenterDialogData {
  readonly organizationId: string;
  readonly costCenter?: CostCenterDTO | null;
}

interface CostCenterDialogTabDef {
  readonly id: 'general' | 'finance' | 'sustainability';
  readonly label: string;
  readonly headline: string;
  readonly fields: ReadonlyArray<CostCenterFormFieldDef>;
}

function generateLocalCostCenterId(): string {
  const cryptoRef = globalThis.crypto as Crypto | undefined;
  return typeof cryptoRef?.randomUUID === 'function'
    ? cryptoRef.randomUUID()
    : `cc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

const ALL_FIELDS: ReadonlyArray<CostCenterFormFieldDef> = COST_CENTER_FORM_TABS.flatMap(
  (tab) => tab.fields
);

function pickField(key: keyof CostCenterFormValue): CostCenterFormFieldDef {
  const field = ALL_FIELDS.find((candidate) => candidate.key === key);
  if (!field) throw new Error(`Cost center field not found: ${String(key)}`);
  // Forzamos mdCols: 6 (grid de 2 columnas) según diseño del modal.
  return { ...field, mdCols: 6 } as CostCenterFormFieldDef;
}

const DIALOG_TABS: ReadonlyArray<CostCenterDialogTabDef> = Object.freeze([
  {
    id: 'general',
    label: 'General',
    headline: 'Identidad y responsable',
    fields: [
      pickField('name'),
      pickField('externalId'),
      pickField('type'),
      pickField('managerEmail')
    ]
  },
  {
    id: 'finance',
    label: 'Finanzas',
    headline: 'Presupuesto, moneda y umbrales',
    fields: [
      pickField('annualBudget'),
      pickField('currency'),
      pickField('budgetThresholdAlert')
    ]
  },
  {
    id: 'sustainability',
    label: 'Sostenibilidad',
    headline: 'Carbono, intensidad y superficie',
    fields: [
      pickField('carbonBudgetTons'),
      pickField('targetIntensity'),
      pickField('floorAreaSqm')
    ]
  }
]);

@Component({
  selector: 'sms-organization-cost-center-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    DropdownModule,
    InputNumberModule,
    InputTextModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full min-w-0 box-border'
  },
  template: `
    <form class="flex w-full min-w-0 flex-col gap-4 box-border" [formGroup]="form" novalidate>
      <input type="hidden" formControlName="id" />
      <input type="hidden" formControlName="organizationId" />

      <div
        class="w-full rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50 to-white p-2 shadow-sm box-border"
      >
        <div
          role="tablist"
          aria-label="Secciones centro de costo"
          class="flex w-full min-w-0 flex-wrap gap-2"
        >
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              role="tab"
              class="rounded-xl px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider outline-none ring-emerald-500/0 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              [attr.aria-selected]="activeTabId() === tab.id"
              [ngClass]="
                activeTabId() === tab.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/10 ring-1 ring-emerald-500/30'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200/80 hover:bg-emerald-50/90 hover:text-emerald-900 hover:ring-emerald-200/60'
              "
              (click)="selectTab(tab.id)"
            >
              {{ tab.label }}
            </button>
          }
        </div>
      </div>

      @for (tab of tabs; track tab.id) {
        @if (activeTabId() === tab.id) {
          <div
            class="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm md:p-5 box-border"
          >
            <h3 class="mb-4 text-base font-bold text-slate-800">{{ tab.headline }}</h3>
            <div class="grid grid-cols-12 gap-x-4 gap-y-5">
              @for (field of tab.fields; track field.key) {
                <div [class]="gridClass(field)">
                  <label
                    class="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500"
                    [attr.for]="'organization-cost-center-field-' + field.key"
                  >
                    {{ field.label }}
                    @if (field.required && !field.readonly) {
                      <span class="text-rose-600"> *</span>
                    }
                  </label>

                  @switch (field.kind) {
                    @case ('select') {
                      <p-dropdown
                        [inputId]="'organization-cost-center-field-' + field.key"
                        [formControlName]="field.key"
                        [options]="enumOptions(field.enumKey)"
                        optionLabel="label"
                        optionValue="value"
                        [placeholder]="field.placeholder ?? '—'"
                        appendTo="body"
                        styleClass="w-full border-round-xl"
                        [readonly]="field.readonly === true"
                      />
                    }
                    @case ('integer') {
                      <p-inputNumber
                        class="w-full"
                        [inputId]="'organization-cost-center-field-' + field.key"
                        [formControlName]="field.key"
                        [min]="field.min"
                        [max]="field.max"
                        [step]="field.step ?? 1"
                        [useGrouping]="false"
                        [readonly]="field.readonly === true"
                        styleClass="w-full"
                      />
                    }
                    @case ('number') {
                      <p-inputNumber
                        class="w-full"
                        [inputId]="'organization-cost-center-field-' + field.key"
                        [formControlName]="field.key"
                        [min]="field.min"
                        [max]="field.max"
                        [step]="field.step ?? 0.01"
                        [readonly]="field.readonly === true"
                        styleClass="w-full"
                      />
                    }
                    @case ('email') {
                      <input
                        pInputText
                        type="email"
                        class="w-full"
                        [id]="'organization-cost-center-field-' + field.key"
                        [formControlName]="field.key"
                        [readonly]="field.readonly === true"
                        autocomplete="email"
                        [placeholder]="field.placeholder ?? ''"
                      />
                    }
                    @default {
                      <input
                        pInputText
                        type="text"
                        class="w-full"
                        [id]="'organization-cost-center-field-' + field.key"
                        [formControlName]="field.key"
                        [readonly]="field.readonly === true"
                        [placeholder]="field.placeholder ?? ''"
                      />
                    }
                  }

                  @if (isInvalid(field) && isTouched(field) && !field.readonly) {
                    <small class="mt-1 block text-[11px] text-rose-700">
                      {{ errorMessage(field.key) ?? 'Valor inválido' }}
                    </small>
                  }
                </div>
              }
            </div>
          </div>
        }
      }

      @if (errorMsg()) {
        <div
          role="alert"
          class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-[12px] font-semibold text-rose-700"
        >
          {{ errorMsg() }}
        </div>
      }

      <div class="flex w-full flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          pButton
          type="button"
          label="Cancelar"
          icon="pi pi-times"
          severity="secondary"
          class="border-round-xl text-xs font-bold"
          (click)="cancel()"
        ></button>
        <button
          pButton
          type="button"
          [label]="isEdit() ? 'Actualizar centro de costo' : 'Crear centro de costo'"
          icon="pi pi-save"
          class="border-round-xl text-xs font-bold"
          [disabled]="form.invalid"
          (click)="save()"
        ></button>
      </div>
    </form>
  `
})
export class OrganizationCostCenterFormDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly config = inject(DynamicDialogConfig<OrganizationCostCenterDialogData>);
  private readonly ref = inject(DynamicDialogRef<CostCenterDTO | null>);

  readonly form: CostCenterFormGroup = buildCostCenterFormGroup(this.fb);
  readonly controls = this.form.controls as CostCenterFormShape;

  readonly tabs: ReadonlyArray<CostCenterDialogTabDef> = DIALOG_TABS;
  readonly activeTabId = signal<CostCenterDialogTabDef['id']>(DIALOG_TABS[0]?.id ?? 'general');

  readonly isEdit = signal(false);
  readonly errorMsg = signal<string | null>(null);

  ngOnInit(): void {
    const data = this.config.data;
    if (!data?.organizationId?.trim()) {
      this.errorMsg.set('Falta organizationId para crear el centro de costo.');
      return;
    }

    hydrateCostCenterFormFromPartial(this.form, {
      ...(data.costCenter ?? {}),
      organizationId: data.organizationId.trim()
    });

    if (!this.form.controls.id.value.trim()) {
      this.form.controls.id.setValue(generateLocalCostCenterId(), { emitEvent: false });
    }

    this.isEdit.set(Boolean(data.costCenter?.id));
    this.form.controls.organizationId.disable({ emitEvent: false });
    this.form.controls.id.disable({ emitEvent: false });
    this.form.markAllAsTouched();
  }

  selectTab(id: CostCenterDialogTabDef['id']): void {
    this.activeTabId.set(id);
  }

  gridClass(field: CostCenterFormFieldDef): string {
    return COST_CENTER_FIELD_GRID_CLASS[field.mdCols];
  }

  enumOptions(
    key: keyof typeof COST_CENTER_FORM_ENUM_OPTIONS | undefined
  ): Array<SelectOption<string>> {
    if (!key) return [];
    return [...COST_CENTER_FORM_ENUM_OPTIONS[key]] as SelectOption<string>[];
  }

  isInvalid(field: CostCenterFormFieldDef): boolean {
    return this.form.controls[field.key].invalid;
  }

  isTouched(field: CostCenterFormFieldDef): boolean {
    return this.form.controls[field.key].touched;
  }

  errorMessage<K extends keyof CostCenterFormValue>(key: K): string | null {
    const errs = this.form.controls[key].errors as ValidationErrors | null;
    if (!errs) return null;
    if (errs['required']) return 'Campo obligatorio.';
    if (errs['email']) return 'Introduce un email válido.';
    if (errs['min']) return `Valor mínimo: ${errs['min'].min}.`;
    if (errs['max']) return `Valor máximo: ${errs['max'].max}.`;
    return null;
  }

  save(): void {
    this.errorMsg.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMsg.set('Revisá los campos obligatorios del centro de costo.');
      return;
    }

    try {
      const dto = costCenterFormRawValueToDTO(this.form.getRawValue() as CostCenterFormValue);
      const entity = CostCenterEntity.fromDTO(dto);
      this.ref.close(entity.toValue());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo procesar el centro de costo.';
      this.errorMsg.set(msg);
    }
  }

  cancel(): void {
    this.ref.close(null);
  }
}
