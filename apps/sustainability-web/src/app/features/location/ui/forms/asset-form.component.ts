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
  AssetTypeSchema,
  AssetLifecycleStatusSchema,
  type AssetDTO,
  type AssetType,
  type AssetLifecycleStatus
} from '@sms/common';
import { CostCenterAutocompleteComponent } from './cost-center-autocomplete.component';
import { resolveHierarchyContext } from './location-hierarchy-context';

type AssetFormShape = {
  id: FormControl<string>;
  organizationId: FormControl<string>;
  regionId: FormControl<string>;
  branchId: FormControl<string>;
  buildingId: FormControl<string>;
  costCenterId: FormControl<string>;
  name: FormControl<string>;
  type: FormControl<AssetType>;
  status: FormControl<AssetLifecycleStatus>;
  nominalPower: FormControl<number | null>;
  meterId: FormControl<string | null>;
  tagsJson: FormControl<string | null>;
  createdAt: FormControl<string | null>;
  updatedAt: FormControl<string | null>;
};

type AssetFormGroup = FormGroup<AssetFormShape>;

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
  selector: 'sms-asset-form',
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
          <input type="hidden" formControlName="buildingId" />
          <input type="hidden" formControlName="id" />
          <div class="col-span-12 md:col-span-8">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">name</label>
            <input pInputText class="w-full" formControlName="name" />
          </div>
          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">type</label>
            <p-dropdown
              [options]="typeOptions"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full border-round-xl"
              appendTo="body"
              formControlName="type"
            />
          </div>
          <div class="col-span-12 md:col-span-6">
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
          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Nominal power (kW)</label>
            <p-inputNumber class="w-full" [min]="0" formControlName="nominalPower" />
          </div>
          <input type="hidden" formControlName="meterId" />
        </div>
      </p-card>

      <p-card styleClass="border-round-2xl shadow-1">
        <ng-template pTemplate="title">Relación financiera (Cost Center)</ng-template>
        <sms-cost-center-autocomplete
          [branchId]="form.controls.branchId.value"
          [value]="form.controls.costCenterId.value"
          (valueChange)="onCostCenter($event)"
        />
      </p-card>

      <p-card styleClass="border-round-2xl shadow-1">
        <ng-template pTemplate="title">Configuración técnica</ng-template>
        <div class="grid grid-cols-12 gap-3">
          <div class="col-span-12">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">tags (JSON key/value)</label>
            <input pInputText class="w-full" formControlName="tagsJson" placeholder='{"criticality":"HIGH"}' />
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
export class AssetFormComponent {
  @Input({ required: true }) parentNode!: SmsLocationNode;
  @Output() dto = new EventEmitter<AssetDTO>();

  readonly preview = signal(false);
  readonly ctx = computed(() => resolveHierarchyContext(this.parentNode));
  private readonly location = inject(LocationService);
  private lastResetValue: ReturnType<AssetFormGroup['getRawValue']> | null = null;
  private lockChainOfCommand(): void {
    this.form.controls.organizationId.disable({ emitEvent: false });
    this.form.controls.regionId.disable({ emitEvent: false });
    this.form.controls.branchId.disable({ emitEvent: false });
    this.form.controls.buildingId.disable({ emitEvent: false });
  }

  private readonly fb = new FormBuilder().nonNullable;
  readonly form: AssetFormGroup = this.fb.group({
    id: this.fb.control('', { validators: [Validators.required] }),
    organizationId: this.fb.control('', { validators: [Validators.required] }),
    regionId: this.fb.control('', { validators: [Validators.required] }),
    branchId: this.fb.control('', { validators: [Validators.required] }),
    buildingId: this.fb.control('', { validators: [Validators.required] }),
    costCenterId: this.fb.control('', { validators: [Validators.required] }),
    name: this.fb.control('', { validators: [Validators.required] }),
    type: this.fb.control((AssetTypeSchema.options[0] ?? 'HVAC') as AssetType, { validators: [Validators.required] }),
    status: this.fb.control((AssetLifecycleStatusSchema.options[0] ?? 'ACTIVE') as AssetLifecycleStatus, { validators: [Validators.required] }),
    nominalPower: this.fb.control<number | null>(null, { validators: [Validators.min(0)] }),
    meterId: this.fb.control<string | null>(null),
    tagsJson: this.fb.control<string | null>(null),
    createdAt: this.fb.control<string | null>(null),
    updatedAt: this.fb.control<string | null>(null)
  });

  readonly typeOptions = optionsOf(AssetTypeSchema.options as readonly AssetType[]);
  readonly statusOptions = optionsOf(AssetLifecycleStatusSchema.options as readonly AssetLifecycleStatus[]);

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
    if (ctx.buildingId) {
      this.form.controls.buildingId.setValue(ctx.buildingId);
    }
    if (this.parentNode.type === 'ASSET') {
      this.form.controls.id.setValue(this.parentNode.location_id);
    }

    const meta = this.parentNode.metadata as unknown as Partial<AssetDTO> | null | undefined;
    if (meta) {
      if (typeof meta.name === 'string') this.form.controls.name.setValue(meta.name);
      if (typeof meta.type === 'string') this.form.controls.type.setValue(meta.type as AssetType);
      if (typeof meta.status === 'string') this.form.controls.status.setValue(meta.status as AssetLifecycleStatus);
      if (typeof meta.nominalPower === 'number') this.form.controls.nominalPower.setValue(meta.nominalPower);
      if (typeof meta.meterId === 'string') this.form.controls.meterId.setValue(meta.meterId);
      if (typeof meta.costCenterId === 'string') this.form.controls.costCenterId.setValue(meta.costCenterId);
      if (meta.tags && typeof meta.tags === 'object') {
        this.form.controls.tagsJson.setValue(JSON.stringify(meta.tags, null, 2));
      }
      if (typeof meta.createdAt === 'string') this.form.controls.createdAt.setValue(meta.createdAt);
      if (typeof meta.updatedAt === 'string') this.form.controls.updatedAt.setValue(meta.updatedAt);
    }

    this.lockChainOfCommand();
    this.lastResetValue = this.form.getRawValue();
    this.form.markAsPristine();
  }

  onCostCenter(id: string | null): void {
    this.form.controls.costCenterId.setValue(id ?? '');
    // p-autoComplete dispara valueChange por código, no como input nativo;
    // marcamos dirty para habilitar Save cuando el usuario selecciona.
    this.form.controls.costCenterId.markAsDirty();
    this.form.markAsDirty();
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const dto = this.toDTO();
    this.location.lastError.set('Guardando activo…');
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
      const msg = e instanceof Error ? e.message : 'Error desconocido guardando activo';
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

  private toDTO(): AssetDTO {
    const v = this.form.getRawValue();
    const tags = this.parseTags(v.tagsJson);
    return {
      id: v.id,
      organizationId: v.organizationId,
      regionId: v.regionId,
      branchId: v.branchId,
      buildingId: v.buildingId,
      costCenterId: v.costCenterId,
      name: v.name,
      type: v.type,
      status: v.status,
      ...(v.nominalPower !== null && v.nominalPower !== undefined ? { nominalPower: v.nominalPower } : {}),
      ...(v.meterId?.trim() ? { meterId: v.meterId.trim() } : {}),
      ...(tags ? { tags } : {}),
      ...(v.createdAt ? { createdAt: v.createdAt } : {}),
      ...(v.updatedAt ? { updatedAt: v.updatedAt } : {})
    };
  }

  private parseTags(raw: string | null): Record<string, string> | undefined {
    const s = (raw ?? '').trim();
    if (!s) return undefined;
    try {
      const obj = JSON.parse(s) as unknown;
      if (typeof obj !== 'object' || obj === null) return undefined;
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        if (!k.trim()) continue;
        out[k] = String(v ?? '').trim();
      }
      return Object.keys(out).length ? out : undefined;
    } catch {
      return undefined;
    }
  }
}

