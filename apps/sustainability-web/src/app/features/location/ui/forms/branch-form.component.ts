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
  FacilityTypeSchema,
  LifecycleStatusSchema,
  type BranchDTO,
  type FacilityType,
  type LifecycleStatus
} from '@sms/common';
import { CostCenterAutocompleteComponent } from './cost-center-autocomplete.component';
import { TariffFormListComponent } from './tariff-form-list.component';
import { resolveHierarchyContext } from './location-hierarchy-context';

type BranchFormShape = {
  id: FormControl<string>;
  organizationId: FormControl<string>;
  regionId: FormControl<string>;
  name: FormControl<string>;
  timezone: FormControl<string>;
  m2Surface: FormControl<number>;
  facilityType: FormControl<FacilityType>;
  energyTarget: FormControl<number | null>;
  isHeadquarters: FormControl<boolean>;
  status: FormControl<LifecycleStatus>;
  addressStreet1: FormControl<string | null>;
  addressCity: FormControl<string | null>;
  addressCountryCode: FormControl<string | null>;
  createdAt: FormControl<string | null>;
  updatedAt: FormControl<string | null>;
};

type BranchFormGroup = FormGroup<BranchFormShape>;

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
  selector: 'sms-branch-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    DropdownModule,
    CostCenterAutocompleteComponent,
    TariffFormListComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="flex flex-column gap-4 max-w-[980px] mx-auto" [formGroup]="form">
      <p-card styleClass="border-round-2xl shadow-1">
        <ng-template pTemplate="title">Identidad</ng-template>
        <div class="grid grid-cols-12 gap-3">
          <input type="hidden" formControlName="organizationId" />
          <input type="hidden" formControlName="regionId" />
          <input type="hidden" formControlName="id" />
          <div class="col-span-12 md:col-span-8">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">name</label>
            <input pInputText class="w-full" formControlName="name" />
          </div>
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
        </div>
      </p-card>

      <p-card styleClass="border-round-2xl shadow-1">
        <ng-template pTemplate="title">Dimensiones y operación</ng-template>
        <div class="grid grid-cols-12 gap-3">
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Timezone</label>
            <input pInputText class="w-full" formControlName="timezone" placeholder="Asia/Jerusalem" />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Surface (m²)</label>
            <p-inputNumber class="w-full" [min]="0" formControlName="m2Surface" />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Facility type</label>
            <p-dropdown
              [options]="facilityTypeOptions"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full border-round-xl"
              appendTo="body"
              formControlName="facilityType"
            />
          </div>
          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Energy target (optional)</label>
            <p-inputNumber class="w-full" [min]="0" formControlName="energyTarget" />
          </div>
          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">HQ</label>
            <div class="flex align-items-center gap-2">
              <input type="checkbox" [checked]="form.controls.isHeadquarters.value" (change)="toggleHq($event)" />
              <span class="text-sm text-slate-700">isHeadquarters</span>
            </div>
          </div>
        </div>
      </p-card>

      <p-card styleClass="border-round-2xl shadow-1">
        <ng-template pTemplate="title">Configuración técnica / Dirección</ng-template>
        <div class="grid grid-cols-12 gap-3">
          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Street line 1</label>
            <input pInputText class="w-full" formControlName="addressStreet1" placeholder="(optional)" />
          </div>
          <div class="col-span-12 md:col-span-3">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">City</label>
            <input pInputText class="w-full" formControlName="addressCity" placeholder="(optional)" />
          </div>
          <div class="col-span-12 md:col-span-3">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Country</label>
            <input pInputText class="w-full" formControlName="addressCountryCode" placeholder="IL" />
          </div>
        </div>
      </p-card>

      <p-card styleClass="border-round-2xl shadow-1">
        <ng-template pTemplate="title">Relación transversal</ng-template>
        <div class="grid grid-cols-12 gap-3">
          <div class="col-span-12">
            <sms-cost-center-autocomplete
              [branchId]="form.controls.id.value"
              [value]="selectedCostCenterId()"
              (valueChange)="onCostCenter($event)"
            />
            <div class="text-[11px] text-slate-500 mt-2">
              Esta selección se emite como relación (no forma parte de BranchDTO).
            </div>
          </div>
        </div>
      </p-card>

      <sms-tariff-form-list
        [orgId]="form.controls.organizationId.value"
        [branchId]="form.controls.id.value"
        (tariffsChange)="tariffs.emit($event)"
      />

      <div class="flex justify-content-between gap-2 flex-wrap">
        <div class="flex gap-2 flex-wrap">
          <button pButton type="button" label="Reset" icon="pi pi-refresh" severity="secondary" (click)="reset()" [disabled]="!form.dirty"></button>
          <button pButton type="button" label="Save" icon="pi pi-save" (click)="save()" [disabled]="form.invalid || !form.dirty"></button>
          <button pButton type="button" label="DTO preview" icon="pi pi-code" severity="secondary" (click)="togglePreview()"></button>
        </div>
      </div>

      <pre class="text-xs bg-slate-950 text-slate-100 p-3 rounded-xl overflow-auto" *ngIf="preview()">{{ dtoPreview() }}</pre>
    </form>
  `
})
export class BranchFormComponent {
  @Input({ required: true }) parentNode!: SmsLocationNode;

  /** Output DTO puro (exact signature). */
  @Output() dto = new EventEmitter<BranchDTO>();
  /** Relación transversal sugerida (no está en BranchDTO). */
  @Output() costCenterSelected = new EventEmitter<string | null>();
  /** Tariffs vinculadas a la sucursal. */
  @Output() tariffs = new EventEmitter<import('@sms/common').TariffDTO[]>();

  readonly preview = signal(false);
  readonly selectedCostCenterId = signal<string | null>(null);
  readonly ctx = computed(() => resolveHierarchyContext(this.parentNode));
  private readonly location = inject(LocationService);
  private lastResetValue: ReturnType<BranchFormGroup['getRawValue']> | null = null;
  private lockChainOfCommand(): void {
    // IDs jerárquicos deben ser read-only para integridad referencial.
    this.form.controls.organizationId.disable({ emitEvent: false });
    this.form.controls.regionId.disable({ emitEvent: false });
  }

  private readonly fb = new FormBuilder().nonNullable;
  readonly form: BranchFormGroup = this.fb.group({
    id: this.fb.control('', { validators: [Validators.required] }),
    organizationId: this.fb.control('', { validators: [Validators.required] }),
    regionId: this.fb.control('', { validators: [Validators.required] }),
    name: this.fb.control('', { validators: [Validators.required] }),
    timezone: this.fb.control('', { validators: [Validators.required] }),
    m2Surface: this.fb.control(0, { validators: [Validators.required, Validators.min(0)] }),
    facilityType: this.fb.control((FacilityTypeSchema.options[0] ?? 'MANUFACTURING') as FacilityType, {
      validators: [Validators.required]
    }),
    energyTarget: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
    isHeadquarters: this.fb.control(false, { validators: [Validators.required] }),
    status: this.fb.control((LifecycleStatusSchema.options[0] ?? 'ACTIVE') as LifecycleStatus, { validators: [Validators.required] }),
    addressStreet1: this.fb.control<string | null>(null),
    addressCity: this.fb.control<string | null>(null),
    addressCountryCode: this.fb.control<string | null>(null),
    createdAt: this.fb.control<string | null>(null),
    updatedAt: this.fb.control<string | null>(null)
  });

  readonly facilityTypeOptions = optionsOf(FacilityTypeSchema.options as readonly FacilityType[]);
  readonly statusOptions = optionsOf(LifecycleStatusSchema.options as readonly LifecycleStatus[]);

  ngOnChanges(): void {
    const ctx = this.ctx();
    if (ctx.organizationId) {
      this.form.controls.organizationId.setValue(ctx.organizationId);
    }
    if (ctx.regionId) {
      this.form.controls.regionId.setValue(ctx.regionId);
    }
    if (this.parentNode.type === 'BRANCH') {
      this.form.controls.id.setValue(this.parentNode.location_id);
    }

    const meta = this.parentNode.metadata as unknown as Partial<BranchDTO> | null | undefined;
    if (meta) {
      if (typeof meta.name === 'string') this.form.controls.name.setValue(meta.name);
      if (typeof meta.timezone === 'string') this.form.controls.timezone.setValue(meta.timezone);
      if (typeof meta.m2Surface === 'number') this.form.controls.m2Surface.setValue(meta.m2Surface);
      if (typeof meta.facilityType === 'string') this.form.controls.facilityType.setValue(meta.facilityType as FacilityType);
      if (typeof meta.energyTarget === 'number') this.form.controls.energyTarget.setValue(meta.energyTarget);
      if (typeof meta.isHeadquarters === 'boolean') this.form.controls.isHeadquarters.setValue(meta.isHeadquarters);
      if (meta.status === 'ACTIVE' || meta.status === 'INACTIVE') this.form.controls.status.setValue(meta.status);

      if (meta.address) {
        if (typeof meta.address.streetLine1 === 'string') this.form.controls.addressStreet1.setValue(meta.address.streetLine1);
        if (typeof meta.address.city === 'string') this.form.controls.addressCity.setValue(meta.address.city);
        if (typeof meta.address.countryCode === 'string')
          this.form.controls.addressCountryCode.setValue(meta.address.countryCode);
      }

      if (typeof meta.createdAt === 'string') this.form.controls.createdAt.setValue(meta.createdAt);
      if (typeof meta.updatedAt === 'string') this.form.controls.updatedAt.setValue(meta.updatedAt);
    }

    this.lockChainOfCommand();
    this.lastResetValue = this.form.getRawValue();
    this.form.markAsPristine();
  }

  toggleHq(ev: Event): void {
    const checked = Boolean((ev.target as HTMLInputElement | null)?.checked);
    this.form.controls.isHeadquarters.setValue(checked);
  }

  onCostCenter(id: string | null): void {
    this.selectedCostCenterId.set(id);
    // El Cost Center no está en el FormGroup; marcamos dirty para habilitar Save.
    this.form.markAsDirty();
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const dto = this.toDTO();
    this.location.lastError.set('Guardando sucursal…');
    try {
      await this.location.updateNode(this.parentNode.location_id, {
        name: dto.name,
        status: toSmsNodeStatus(dto.status),
        metadata: dto
      });
      this.location.lastError.set(null);
      this.dto.emit(dto);
      this.costCenterSelected.emit(this.selectedCostCenterId());
      this.lastResetValue = this.form.getRawValue();
      this.form.markAsPristine();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido guardando sucursal';
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

  private toDTO(): BranchDTO {
    const v = this.form.getRawValue();
    const hasAddress = Boolean(v.addressStreet1?.trim() && v.addressCity?.trim() && v.addressCountryCode?.trim());
    return {
      id: v.id,
      organizationId: v.organizationId,
      regionId: v.regionId,
      name: v.name,
      timezone: v.timezone,
      m2Surface: v.m2Surface,
      facilityType: v.facilityType,
      status: v.status,
      isHeadquarters: v.isHeadquarters,
      ...(v.energyTarget !== null && v.energyTarget !== undefined ? { energyTarget: v.energyTarget } : {}),
      ...(hasAddress
        ? { address: { streetLine1: v.addressStreet1 as string, city: v.addressCity as string, countryCode: v.addressCountryCode as string } }
        : {}),
      ...(v.createdAt ? { createdAt: v.createdAt } : {}),
      ...(v.updatedAt ? { updatedAt: v.updatedAt } : {})
    };
  }
}

