import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, type FormControl, type FormGroup } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import type { SmsLocationNode } from '../../../../core/models/sms-location-node.model';
import type { SmsNodeStatus } from '../../../../core/models/sms-location-node.model';
import { LocationService } from '../../services/location.service';
import {
  CostAllocationMethodSchema,
  LifecycleStatusSchema,
  type CostAllocationMethod,
  type CostCenterDTO,
  type LifecycleStatus
} from '@sms/common';
import { resolveHierarchyContext } from './location-hierarchy-context';

type CostCenterFormShape = {
  id: FormControl<string>;
  organizationId: FormControl<string>;
  name: FormControl<string>;
  branchId: FormControl<string | null>;
  buildingId: FormControl<string | null>;
  annualBudget: FormControl<number>;
  currency: FormControl<string>;
  fiscalYear: FormControl<number>;
  allocationMethod: FormControl<CostAllocationMethod>;
  percentage: FormControl<number>;
  externalId: FormControl<string | null>;
  status: FormControl<LifecycleStatus>;
  updatedAt: FormControl<string | null>;
};

type CostCenterFormGroup = FormGroup<CostCenterFormShape>;

interface SelectOption<T> {
  label: string;
  value: T;
}

function optionsOf<T extends string>(values: readonly T[]): SelectOption<T>[] {
  return values.map((v) => ({ label: v, value: v }));
}

function toSmsNodeStatus(status: unknown): SmsNodeStatus {
  if (status === 'ACTIVE' || status === 'OPERATIONAL') return 'ACTIVE';
  if (status === 'ALERT') return 'ALERT';
  return 'MAINTENANCE';
}

@Component({
  selector: 'sms-cost-center-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardModule, ButtonModule, InputTextModule, InputNumberModule, DropdownModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="flex flex-column gap-4 max-w-[980px] mx-auto" [formGroup]="form">
      <p-card styleClass="border-round-2xl shadow-1">
        <ng-template pTemplate="title">Identidad</ng-template>
        <div class="grid grid-cols-12 gap-3">
          <input type="hidden" formControlName="organizationId" />
          <input type="hidden" formControlName="id" />
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">status</label>
            <p-dropdown
              [options]="statusOptions"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full border-round-xl"
              appendTo="body"
              formControlName="status"
            />
          </div>
          <div class="col-span-12">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">name</label>
            <input pInputText class="w-full" formControlName="name" />
          </div>
        </div>
      </p-card>

      <p-card styleClass="border-round-2xl shadow-1">
        <ng-template pTemplate="title">Dimensiones y operación</ng-template>
        <div class="grid grid-cols-12 gap-3">
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Annual budget</label>
            <p-inputNumber class="w-full" [min]="0" formControlName="annualBudget" />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Currency</label>
            <input pInputText class="w-full" formControlName="currency" />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Fiscal year</label>
            <p-inputNumber class="w-full" [useGrouping]="false" formControlName="fiscalYear" />
          </div>
          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Allocation method</label>
            <p-dropdown
              [options]="methodOptions"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full border-round-xl"
              appendTo="body"
              formControlName="allocationMethod"
            />
          </div>
          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Percentage</label>
            <p-inputNumber class="w-full" [min]="0" [max]="100" formControlName="percentage" />
          </div>
        </div>
      </p-card>

      <p-card styleClass="border-round-2xl shadow-1">
        <ng-template pTemplate="title">Adjuntos jerárquicos</ng-template>
        <div class="grid grid-cols-12 gap-3">
          <input type="hidden" formControlName="branchId" />
          <input type="hidden" formControlName="buildingId" />
          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">External ID</label>
            <input pInputText class="w-full" formControlName="externalId" placeholder="(optional)" />
          </div>
        </div>
      </p-card>

      <div class="flex gap-2 flex-wrap justify-content-end">
        <button pButton type="button" label="Reset" icon="pi pi-refresh" severity="secondary" (click)="reset()" [disabled]="!form.dirty"></button>
        <button pButton type="button" label="Save" icon="pi pi-save" (click)="save()" [disabled]="form.invalid || !form.dirty"></button>
        <button pButton type="button" label="DTO preview" icon="pi pi-code" severity="secondary" (click)="togglePreview()"></button>
      </div>
      <pre class="text-xs bg-slate-950 text-slate-100 p-3 rounded-xl overflow-auto" *ngIf="preview()">{{ dtoPreview() }}</pre>
    </form>
  `
})
export class CostCenterFormComponent {
  @Input({ required: true }) parentNode!: SmsLocationNode;
  @Output() dto = new EventEmitter<CostCenterDTO>();

  readonly preview = signal(false);
  readonly ctx = computed(() => resolveHierarchyContext(this.parentNode));
  private readonly location = inject(LocationService);
  private lastResetValue: ReturnType<CostCenterFormGroup['getRawValue']> | null = null;
  private lockChainOfCommand(): void {
    this.form.controls.organizationId.disable({ emitEvent: false });
  }

  private readonly fb = new FormBuilder().nonNullable;
  readonly form: CostCenterFormGroup = this.fb.group({
    id: this.fb.control('', { validators: [Validators.required] }),
    organizationId: this.fb.control('', { validators: [Validators.required] }),
    name: this.fb.control('', { validators: [Validators.required] }),
    branchId: this.fb.control<string | null>(null),
    buildingId: this.fb.control<string | null>(null),
    annualBudget: this.fb.control(0, { validators: [Validators.required, Validators.min(0)] }),
    currency: this.fb.control('ILS', { validators: [Validators.required] }),
    fiscalYear: this.fb.control(new Date().getFullYear(), { validators: [Validators.required] }),
    allocationMethod: this.fb.control((CostAllocationMethodSchema.options[0] ?? 'SQUARE_METERS') as CostAllocationMethod, {
      validators: [Validators.required]
    }),
    percentage: this.fb.control(100, { validators: [Validators.required, Validators.min(0), Validators.max(100)] }),
    externalId: this.fb.control<string | null>(null),
    status: this.fb.control((LifecycleStatusSchema.options[0] ?? 'ACTIVE') as LifecycleStatus, { validators: [Validators.required] }),
    updatedAt: this.fb.control<string | null>(null)
  });

  readonly methodOptions = optionsOf(CostAllocationMethodSchema.options as readonly CostAllocationMethod[]);
  readonly statusOptions = optionsOf(LifecycleStatusSchema.options as readonly LifecycleStatus[]);

  ngOnChanges(): void {
    const ctx = this.ctx();
    if (ctx.organizationId) {
      this.form.controls.organizationId.setValue(ctx.organizationId);
    }
    // Si el CC cuelga del árbol, por defecto se asocia al branch/building del contexto.
    if (ctx.branchId) this.form.controls.branchId.setValue(ctx.branchId);
    if (ctx.buildingId) this.form.controls.buildingId.setValue(ctx.buildingId);
    if (this.parentNode.type === 'COST_CENTER') {
      this.form.controls.id.setValue(this.parentNode.location_id);
    }

    const meta = this.parentNode.metadata as unknown as Partial<CostCenterDTO> | null | undefined;
    if (meta) {
      if (typeof meta.name === 'string') this.form.controls.name.setValue(meta.name);
      if (typeof meta.annualBudget === 'number') this.form.controls.annualBudget.setValue(meta.annualBudget);
      if (typeof meta.currency === 'string') this.form.controls.currency.setValue(meta.currency);
      if (typeof meta.fiscalYear === 'number') this.form.controls.fiscalYear.setValue(meta.fiscalYear);
      if (typeof meta.allocationMethod === 'string')
        this.form.controls.allocationMethod.setValue(meta.allocationMethod as CostAllocationMethod);
      if (typeof meta.percentage === 'number') this.form.controls.percentage.setValue(meta.percentage);
      if (typeof meta.externalId === 'string') this.form.controls.externalId.setValue(meta.externalId);
      if (meta.status === 'ACTIVE' || meta.status === 'INACTIVE') this.form.controls.status.setValue(meta.status);
      if (typeof meta.branchId === 'string') this.form.controls.branchId.setValue(meta.branchId);
      if (typeof meta.buildingId === 'string') this.form.controls.buildingId.setValue(meta.buildingId);
      if (typeof meta.updatedAt === 'string') this.form.controls.updatedAt.setValue(meta.updatedAt);
    }

    this.lockChainOfCommand();
    this.lastResetValue = this.form.getRawValue();
    this.form.markAsPristine();
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const dto = this.toDTO();
    this.location.lastError.set('Guardando centro de costo…');
    try {
      await this.location.updateNode(this.parentNode.location_id, {
        name: dto.name,
        status: toSmsNodeStatus(dto.status),
        metadata: dto
      });
      this.location.lastError.set(null);
      this.dto.emit(dto);
      this.lastResetValue = this.form.getRawValue();
      this.form.markAsPristine();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido guardando centro de costo';
      this.location.lastError.set(msg);
    }
  }

  reset(): void {
    if (!this.lastResetValue) return;
    this.form.reset(this.lastResetValue, { emitEvent: false });
    this.lockChainOfCommand();
    this.form.markAsPristine();
  }

  togglePreview(): void {
    this.preview.update((x) => !x);
  }

  dtoPreview(): string {
    return JSON.stringify(this.toDTO(), null, 2);
  }

  private toDTO(): CostCenterDTO {
    const v = this.form.getRawValue();
    return {
      id: v.id,
      organizationId: v.organizationId,
      name: v.name,
      annualBudget: v.annualBudget,
      currency: v.currency || 'ILS',
      fiscalYear: v.fiscalYear,
      allocationMethod: v.allocationMethod,
      percentage: v.percentage,
      status: v.status,
      ...(v.branchId?.trim() ? { branchId: v.branchId.trim() } : {}),
      ...(v.buildingId?.trim() ? { buildingId: v.buildingId.trim() } : {}),
      ...(v.externalId?.trim() ? { externalId: v.externalId.trim() } : {}),
      ...(v.updatedAt ? { updatedAt: v.updatedAt } : {})
    };
  }
}

