import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators, type FormControl, type FormGroup } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import {
  EnergyServiceTypeSchema,
  TariffLifecycleStatusSchema,
  TariffPricingModelSchema,
  type EnergyServiceType,
  type TariffLifecycleStatus,
  type TariffPricingModel,
  type TariffDTO
} from '@sms/common';

type TariffFormShape = {
  id: FormControl<string | null>;
  orgId: FormControl<string>;
  branchId: FormControl<string>;
  buildingId: FormControl<string | null>;
  serviceType: FormControl<EnergyServiceType>;
  providerName: FormControl<string>;
  contractId: FormControl<string>;
  pricingModel: FormControl<TariffPricingModel>;
  baseRate: FormControl<number>;
  currency: FormControl<string>;
  validFrom: FormControl<string>;
  validTo: FormControl<string>;
  status: FormControl<TariffLifecycleStatus>;
};

type TariffFormGroup = FormGroup<TariffFormShape>;

interface SelectOption<T> {
  label: string;
  value: T;
}

function optionsOf<T extends string>(values: readonly T[]): SelectOption<T>[] {
  return values.map((v) => ({ label: v, value: v }));
}

@Component({
  selector: 'sms-tariff-form-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    DropdownModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card styleClass="border-round-2xl shadow-1">
      <ng-template pTemplate="title">Tariffs / contratos</ng-template>
      <ng-template pTemplate="subtitle">Gestioná uno o varios contratos para esta sucursal.</ng-template>

      <div class="flex flex-column gap-3">
        <div class="flex gap-2 flex-wrap">
          <button pButton type="button" label="Add tariff" icon="pi pi-plus" (click)="add()"></button>
          <button
            pButton
            type="button"
            label="Emit"
            icon="pi pi-send"
            severity="secondary"
            (click)="emitTariffs()"
            [disabled]="array.invalid"
          ></button>
        </div>

        <div class="text-[11px] text-rose-700" *ngIf="array.invalid">
          Hay tarifas inválidas. Revisá campos obligatorios y rangos.
        </div>

        <div class="grid grid-cols-12 gap-3" *ngFor="let g of groups(); let i = index">
          <div class="col-span-12 flex align-items-center justify-content-between gap-2">
            <div class="text-xs font-black uppercase tracking-wider text-slate-600">Tariff #{{ i + 1 }}</div>
            <button pButton type="button" label="Remove" icon="pi pi-trash" severity="danger" (click)="remove(i)"></button>
          </div>

          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Service type</label>
            <p-dropdown
              [options]="serviceTypeOptions"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full border-round-xl"
              appendTo="body"
              [formControl]="g.controls.serviceType"
            />
          </div>

          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Pricing model</label>
            <p-dropdown
              [options]="pricingModelOptions"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full border-round-xl"
              appendTo="body"
              [formControl]="g.controls.pricingModel"
            />
          </div>

          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Status</label>
            <p-dropdown
              [options]="statusOptions"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full border-round-xl"
              appendTo="body"
              [formControl]="g.controls.status"
            />
          </div>

          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Provider name</label>
            <input pInputText class="w-full" [formControl]="g.controls.providerName" />
          </div>

          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Contract ID</label>
            <input pInputText class="w-full" [formControl]="g.controls.contractId" />
          </div>

          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Base rate</label>
            <p-inputNumber class="w-full" [min]="0" [formControl]="g.controls.baseRate" />
          </div>

          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Currency</label>
            <input pInputText class="w-full" [formControl]="g.controls.currency" placeholder="ILS" />
          </div>

          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Building (optional)</label>
            <input pInputText class="w-full" [formControl]="g.controls.buildingId" placeholder="buildingId" />
          </div>

          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Valid from (YYYY-MM-DD)</label>
            <input pInputText class="w-full" [formControl]="g.controls.validFrom" placeholder="2026-01-01" />
          </div>

          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Valid to (YYYY-MM-DD)</label>
            <input pInputText class="w-full" [formControl]="g.controls.validTo" placeholder="2026-12-31" />
          </div>

          <div class="col-span-12"><hr class="border-slate-200" /></div>
        </div>
      </div>
    </p-card>
  `
})
export class TariffFormListComponent {
  private readonly fb = inject(FormBuilder);

  @Input({ required: true }) orgId!: string;
  @Input({ required: true }) branchId!: string;
  @Output() tariffsChange = new EventEmitter<TariffDTO[]>();

  readonly array = this.fb.array<TariffFormGroup>([]);
  readonly groups = computed(() => this.array.controls);

  readonly serviceTypeOptions = optionsOf(EnergyServiceTypeSchema.options as readonly EnergyServiceType[]);
  readonly pricingModelOptions = optionsOf(TariffPricingModelSchema.options as readonly TariffPricingModel[]);
  readonly statusOptions = optionsOf(TariffLifecycleStatusSchema.options as readonly TariffLifecycleStatus[]);

  add(): void {
    this.array.push(this.createGroup());
  }

  remove(i: number): void {
    this.array.removeAt(i);
    this.emitTariffs();
  }

  emitTariffs(): void {
    if (this.array.invalid) return;
    this.tariffsChange.emit(this.array.controls.map((g) => this.toDTO(g)));
  }

  private createGroup(): TariffFormGroup {
    return this.fb.group<TariffFormShape>({
      id: this.fb.control<string | null>(null),
      orgId: this.fb.control(this.orgId, { nonNullable: true, validators: [Validators.required] }),
      branchId: this.fb.control(this.branchId, { nonNullable: true, validators: [Validators.required] }),
      buildingId: this.fb.control<string | null>(null),
      serviceType: this.fb.control<EnergyServiceType>(this.serviceTypeOptions[0]?.value ?? 'ELECTRICITY', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      providerName: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
      contractId: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
      pricingModel: this.fb.control<TariffPricingModel>(this.pricingModelOptions[0]?.value ?? 'TIME_OF_USE', {
        nonNullable: true,
        validators: [Validators.required]
      }),
      baseRate: this.fb.control(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
      currency: this.fb.control('ILS', { nonNullable: true, validators: [Validators.required] }),
      validFrom: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
      validTo: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
      status: this.fb.control<TariffLifecycleStatus>(this.statusOptions[0]?.value ?? 'ACTIVE', {
        nonNullable: true,
        validators: [Validators.required]
      })
    });
  }

  private toDTO(g: TariffFormGroup): TariffDTO {
    const v = g.getRawValue();
    // Firma exacta del DTO @sms/common (id opcional)
    return {
      ...(v.id?.trim() ? { id: v.id.trim() } : {}),
      orgId: v.orgId,
      branchId: v.branchId,
      ...(v.buildingId?.trim() ? { buildingId: v.buildingId.trim() } : {}),
      serviceType: v.serviceType,
      providerName: v.providerName,
      contractId: v.contractId,
      pricingModel: v.pricingModel,
      baseRate: v.baseRate,
      currency: v.currency,
      validFrom: v.validFrom,
      validTo: v.validTo,
      status: v.status
    };
  }
}

