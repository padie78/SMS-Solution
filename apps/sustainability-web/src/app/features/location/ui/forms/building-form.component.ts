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
  BuildingUsageTypeSchema,
  HvacTypeSchema,
  MainFuelTypeSchema,
  OperationalStatusSchema,
  type BuildingDTO,
  type BuildingUsageType,
  type HvacType,
  type MainFuelType,
  type OperationalStatus
} from '@sms/common';
import { CostCenterAutocompleteComponent } from './cost-center-autocomplete.component';
import { resolveHierarchyContext } from './location-hierarchy-context';

type BuildingFormShape = {
  id: FormControl<string>;
  organizationId: FormControl<string>;
  regionId: FormControl<string>;
  branchId: FormControl<string>;
  name: FormControl<string>;
  usageTypeEnum: FormControl<BuildingUsageType>;
  usageType: FormControl<string | null>;
  m2Surface: FormControl<number>;
  m3Volume: FormControl<number | null>;
  yearBuilt: FormControl<number | null>;
  hvacType: FormControl<HvacType>;
  hasBms: FormControl<boolean>;
  bmsVendor: FormControl<string | null>;
  mainFuelType: FormControl<MainFuelType | null>;
  status: FormControl<OperationalStatus>;
  lat: FormControl<number | null>;
  lng: FormControl<number | null>;
  createdAt: FormControl<string | null>;
  updatedAt: FormControl<string | null>;
};

type BuildingFormGroup = FormGroup<BuildingFormShape>;

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
  selector: 'sms-building-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    DropdownModule,
    CostCenterAutocompleteComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="flex flex-column gap-4 max-w-[980px] mx-auto" [formGroup]="form">
      <p-card styleClass="border-round-2xl shadow-1">
        <ng-template pTemplate="title">Identidad</ng-template>
        <div class="grid grid-cols-12 gap-3">
          <input type="hidden" formControlName="organizationId" />
          <input type="hidden" formControlName="regionId" />
          <input type="hidden" formControlName="branchId" />
          <input type="hidden" formControlName="id" />
          <div class="col-span-12 md:col-span-8">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">name</label>
            <input pInputText class="w-full" formControlName="name" />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Operational status</label>
            <p-dropdown
              [options]="operationalStatusOptions"
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
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Usage type (enum)</label>
            <p-dropdown
              [options]="usageOptions"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full border-round-xl"
              appendTo="body"
              formControlName="usageTypeEnum"
            />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Surface (m²)</label>
            <p-inputNumber class="w-full" [min]="0" formControlName="m2Surface" />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Volume (m³)</label>
            <p-inputNumber class="w-full" [min]="0" formControlName="m3Volume" />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Year built</label>
            <p-inputNumber class="w-full" [useGrouping]="false" formControlName="yearBuilt" />
          </div>
          <div class="col-span-12 md:col-span-8">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Usage type (legacy, optional)</label>
            <input pInputText class="w-full" formControlName="usageType" placeholder="(optional)" />
          </div>
        </div>
      </p-card>

      <p-card styleClass="border-round-2xl shadow-1">
        <ng-template pTemplate="title">Configuración técnica / IoT</ng-template>
        <div class="grid grid-cols-12 gap-3">
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">HVAC type</label>
            <p-dropdown
              [options]="hvacOptions"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full border-round-xl"
              appendTo="body"
              formControlName="hvacType"
            />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Main fuel</label>
            <p-dropdown
              [options]="fuelOptions"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full border-round-xl"
              appendTo="body"
              [formControl]="form.controls.mainFuelType"
            />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Has BMS</label>
            <div class="flex align-items-center gap-2">
              <input type="checkbox" [checked]="form.controls.hasBms.value" (change)="toggleBms($event)" />
              <span class="text-sm text-slate-700">hasBms</span>
            </div>
          </div>
          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">BMS vendor</label>
            <input pInputText class="w-full" formControlName="bmsVendor" placeholder="(optional)" />
          </div>
          <div class="col-span-12 md:col-span-3">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Latitude</label>
            <p-inputNumber class="w-full" [min]="-90" [max]="90" formControlName="lat" />
          </div>
          <div class="col-span-12 md:col-span-3">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Longitude</label>
            <p-inputNumber class="w-full" [min]="-180" [max]="180" formControlName="lng" />
          </div>
        </div>
      </p-card>

      <p-card styleClass="border-round-2xl shadow-1">
        <ng-template pTemplate="title">Relación transversal</ng-template>
        <sms-cost-center-autocomplete
          [branchId]="form.controls.branchId.value"
          [value]="selectedCostCenterId()"
          (valueChange)="onCostCenter($event)"
        />
        <div class="text-[11px] text-slate-500 mt-2">
          Esta selección se emite como relación (no forma parte de BuildingDTO).
        </div>
      </p-card>

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
export class BuildingFormComponent {
  @Input({ required: true }) parentNode!: SmsLocationNode;

  @Output() dto = new EventEmitter<BuildingDTO>();
  @Output() costCenterSelected = new EventEmitter<string | null>();

  readonly preview = signal(false);
  readonly selectedCostCenterId = signal<string | null>(null);
  readonly ctx = computed(() => resolveHierarchyContext(this.parentNode));
  private readonly location = inject(LocationService);
  private lastResetValue: ReturnType<BuildingFormGroup['getRawValue']> | null = null;
  private lockChainOfCommand(): void {
    this.form.controls.organizationId.disable({ emitEvent: false });
    this.form.controls.regionId.disable({ emitEvent: false });
    this.form.controls.branchId.disable({ emitEvent: false });
  }

  private readonly fb = new FormBuilder().nonNullable;
  readonly form: BuildingFormGroup = this.fb.group({
    id: this.fb.control('', { validators: [Validators.required] }),
    organizationId: this.fb.control('', { validators: [Validators.required] }),
    regionId: this.fb.control('', { validators: [Validators.required] }),
    branchId: this.fb.control('', { validators: [Validators.required] }),
    name: this.fb.control('', { validators: [Validators.required] }),
    usageTypeEnum: this.fb.control((BuildingUsageTypeSchema.options[0] ?? 'STORAGE_INDUSTRIAL') as BuildingUsageType, {
      validators: [Validators.required]
    }),
    usageType: this.fb.control<string | null>(null),
    m2Surface: this.fb.control(0, { validators: [Validators.required, Validators.min(0)] }),
    m3Volume: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
    yearBuilt: this.fb.control<number | null>(null),
    hvacType: this.fb.control((HvacTypeSchema.options[0] ?? 'CENTRAL_CHILLER') as HvacType, { validators: [Validators.required] }),
    hasBms: this.fb.control(false, { validators: [Validators.required] }),
    bmsVendor: this.fb.control<string | null>(null),
    mainFuelType: this.fb.control<MainFuelType | null>(null),
    status: this.fb.control((OperationalStatusSchema.options[0] ?? 'OPERATIONAL') as OperationalStatus, {
      validators: [Validators.required]
    }),
    lat: this.fb.control<number | null>(null),
    lng: this.fb.control<number | null>(null),
    createdAt: this.fb.control<string | null>(null),
    updatedAt: this.fb.control<string | null>(null)
  });

  readonly usageOptions = optionsOf(BuildingUsageTypeSchema.options as readonly BuildingUsageType[]);
  readonly hvacOptions = optionsOf(HvacTypeSchema.options as readonly HvacType[]);
  readonly fuelOptions: Array<SelectOption<MainFuelType | null>> = [
    { label: '(none)', value: null },
    ...optionsOf(MainFuelTypeSchema.options as readonly MainFuelType[])
  ];
  readonly operationalStatusOptions = optionsOf(OperationalStatusSchema.options as readonly OperationalStatus[]);

  ngOnChanges(): void {
    const ctx = this.ctx();
    if (ctx.organizationId) {
      this.form.controls.organizationId.setValue(ctx.organizationId);
    }
    if (ctx.regionId) {
      this.form.controls.regionId.setValue(ctx.regionId);
    }
    if (ctx.branchId) {
      this.form.controls.branchId.setValue(ctx.branchId);
    }
    if (this.parentNode.type === 'BUILDING') {
      this.form.controls.id.setValue(this.parentNode.location_id);
    }

    const meta = this.parentNode.metadata as unknown as Partial<BuildingDTO> | null | undefined;
    if (meta) {
      if (typeof meta.name === 'string') this.form.controls.name.setValue(meta.name);
      if (typeof meta.usageTypeEnum === 'string')
        this.form.controls.usageTypeEnum.setValue(meta.usageTypeEnum as BuildingUsageType);
      if (typeof meta.usageType === 'string') this.form.controls.usageType.setValue(meta.usageType);
      if (typeof meta.m2Surface === 'number') this.form.controls.m2Surface.setValue(meta.m2Surface);
      if (typeof meta.m3Volume === 'number') this.form.controls.m3Volume.setValue(meta.m3Volume);
      if (typeof meta.yearBuilt === 'number') this.form.controls.yearBuilt.setValue(meta.yearBuilt);
      if (typeof meta.hvacType === 'string') this.form.controls.hvacType.setValue(meta.hvacType as HvacType);
      if (typeof meta.hasBms === 'boolean') this.form.controls.hasBms.setValue(meta.hasBms);
      if (typeof meta.bmsVendor === 'string') this.form.controls.bmsVendor.setValue(meta.bmsVendor);
      if (typeof meta.mainFuelType === 'string') this.form.controls.mainFuelType.setValue(meta.mainFuelType as MainFuelType);
      if (typeof meta.status === 'string') this.form.controls.status.setValue(meta.status as OperationalStatus);
      if (meta.coordinates) {
        if (typeof meta.coordinates.lat === 'number') this.form.controls.lat.setValue(meta.coordinates.lat);
        if (typeof meta.coordinates.lng === 'number') this.form.controls.lng.setValue(meta.coordinates.lng);
      }
      if (typeof meta.createdAt === 'string') this.form.controls.createdAt.setValue(meta.createdAt);
      if (typeof meta.updatedAt === 'string') this.form.controls.updatedAt.setValue(meta.updatedAt);
    }

    this.lockChainOfCommand();
    this.lastResetValue = this.form.getRawValue();
    this.form.markAsPristine();
  }

  toggleBms(ev: Event): void {
    const checked = Boolean((ev.target as HTMLInputElement | null)?.checked);
    this.form.controls.hasBms.setValue(checked);
  }

  onCostCenter(id: string | null): void {
    this.selectedCostCenterId.set(id);
    // El Cost Center no está en el FormGroup; marcamos dirty para habilitar Save.
    this.form.markAsDirty();
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const dto = this.toDTO();
    this.location.lastError.set('Guardando edificio…');
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
      const msg = e instanceof Error ? e.message : 'Error desconocido guardando edificio';
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

  private toDTO(): BuildingDTO {
    const v = this.form.getRawValue();
    const hasCoords = v.lat != null && v.lng != null;
    return {
      id: v.id,
      organizationId: v.organizationId,
      regionId: v.regionId,
      branchId: v.branchId,
      name: v.name,
      usageTypeEnum: v.usageTypeEnum,
      m2Surface: v.m2Surface,
      hvacType: v.hvacType,
      hasBms: v.hasBms,
      status: v.status,
      ...(v.usageType?.trim() ? { usageType: v.usageType.trim() } : {}),
      ...(v.m3Volume !== null && v.m3Volume !== undefined ? { m3Volume: v.m3Volume } : {}),
      ...(v.yearBuilt !== null && v.yearBuilt !== undefined ? { yearBuilt: v.yearBuilt } : {}),
      ...(v.bmsVendor?.trim() ? { bmsVendor: v.bmsVendor.trim() } : {}),
      ...(v.mainFuelType ? { mainFuelType: v.mainFuelType } : {}),
      ...(hasCoords ? { coordinates: { lat: v.lat as number, lng: v.lng as number } } : {}),
      ...(v.createdAt ? { createdAt: v.createdAt } : {}),
      ...(v.updatedAt ? { updatedAt: v.updatedAt } : {})
    };
  }
}

