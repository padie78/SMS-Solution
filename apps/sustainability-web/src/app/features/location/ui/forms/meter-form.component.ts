import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, type FormControl, type FormGroup } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import type { SmsLocationNode } from '../../../../core/models/sms-location-node.model';
import type { SmsNodeStatus } from '../../../../core/models/sms-location-node.model';
import { LocationService } from '../../services/location.service';
import {
  MeterTypeSchema,
  MeterOperationalStatusSchema,
  MeterProtocolSchema,
  type MeterDTO,
  type MeterType,
  type MeterOperationalStatus,
  type MeterProtocol
} from '@sms/common';
import { resolveHierarchyContext } from './location-hierarchy-context';

type MeterFormShape = {
  id: FormControl<string>;
  orgId: FormControl<string>;
  regionId: FormControl<string>;
  branchId: FormControl<string>;
  buildingId: FormControl<string>;
  meterType: FormControl<MeterType>;
  serialNumber: FormControl<string>;
  name: FormControl<string>;
  iotName: FormControl<string>;
  protocol: FormControl<MeterProtocol>;
  isMain: FormControl<boolean>;
  assetId: FormControl<string | null>;
  parentMeterId: FormControl<string | null>;
  status: FormControl<MeterOperationalStatus>;
  createdAt: FormControl<string | null>;
  updatedAt: FormControl<string | null>;
};

type MeterFormGroup = FormGroup<MeterFormShape>;

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
  selector: 'sms-meter-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardModule, ButtonModule, InputTextModule, DropdownModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="flex flex-column gap-4 max-w-[980px] mx-auto" [formGroup]="form">
      <p-card styleClass="border-round-2xl shadow-1">
        <ng-template pTemplate="title">Identidad</ng-template>
        <div class="grid grid-cols-12 gap-3">
          <input type="hidden" formControlName="orgId" />
          <input type="hidden" formControlName="regionId" />
          <input type="hidden" formControlName="branchId" />
          <input type="hidden" formControlName="buildingId" />
          <input type="hidden" formControlName="id" />
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">meterType</label>
            <p-dropdown
              [options]="meterTypeOptions"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full border-round-xl"
              appendTo="body"
              formControlName="meterType"
            />
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
          <div class="col-span-12 md:col-span-8">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">name</label>
            <input pInputText class="w-full" formControlName="name" />
          </div>
        </div>
      </p-card>

      <p-card styleClass="border-round-2xl shadow-1">
        <ng-template pTemplate="title">Configuración de Telemetría</ng-template>
        <div class="grid grid-cols-12 gap-3">
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">serialNumber</label>
            <input pInputText class="w-full" formControlName="serialNumber" />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">iotName</label>
            <input pInputText class="w-full" formControlName="iotName" />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">protocol</label>
            <p-dropdown
              [options]="protocolOptions"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full border-round-xl"
              appendTo="body"
              formControlName="protocol"
            />
          </div>
          <input type="hidden" formControlName="assetId" />
          <input type="hidden" formControlName="parentMeterId" />
          <div class="col-span-12">
            <div class="flex align-items-center gap-2">
              <input type="checkbox" [checked]="form.controls.isMain.value" (change)="toggleMain($event)" />
              <span class="text-sm text-slate-700">isMain</span>
            </div>
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
export class MeterFormComponent {
  @Input({ required: true }) parentNode!: SmsLocationNode;
  @Output() dto = new EventEmitter<MeterDTO>();

  readonly preview = signal(false);
  readonly ctx = computed(() => resolveHierarchyContext(this.parentNode));
  private readonly location = inject(LocationService);
  private lastResetValue: ReturnType<MeterFormGroup['getRawValue']> | null = null;
  private lockChainOfCommand(): void {
    this.form.controls.orgId.disable({ emitEvent: false });
    this.form.controls.regionId.disable({ emitEvent: false });
    this.form.controls.branchId.disable({ emitEvent: false });
    this.form.controls.buildingId.disable({ emitEvent: false });
  }

  private readonly fb = new FormBuilder().nonNullable;
  readonly form: MeterFormGroup = this.fb.group({
    id: this.fb.control('', { validators: [Validators.required] }),
    orgId: this.fb.control('', { validators: [Validators.required] }),
    regionId: this.fb.control('', { validators: [Validators.required] }),
    branchId: this.fb.control('', { validators: [Validators.required] }),
    buildingId: this.fb.control('', { validators: [Validators.required] }),
    meterType: this.fb.control((MeterTypeSchema.options[0] ?? 'ELECTRICITY') as MeterType, { validators: [Validators.required] }),
    serialNumber: this.fb.control('', { validators: [Validators.required] }),
    name: this.fb.control('', { validators: [Validators.required] }),
    iotName: this.fb.control('', { validators: [Validators.required] }),
    protocol: this.fb.control((MeterProtocolSchema.options[0] ?? 'MQTT') as MeterProtocol, { validators: [Validators.required] }),
    isMain: this.fb.control(false, { validators: [Validators.required] }),
    assetId: this.fb.control<string | null>(null),
    parentMeterId: this.fb.control<string | null>(null),
    status: this.fb.control((MeterOperationalStatusSchema.options[0] ?? 'ACTIVE') as MeterOperationalStatus, { validators: [Validators.required] }),
    createdAt: this.fb.control<string | null>(null),
    updatedAt: this.fb.control<string | null>(null)
  });

  readonly meterTypeOptions = optionsOf(MeterTypeSchema.options as readonly MeterType[]);
  readonly protocolOptions = optionsOf(MeterProtocolSchema.options as readonly MeterProtocol[]);
  readonly statusOptions = optionsOf(MeterOperationalStatusSchema.options as readonly MeterOperationalStatus[]);

  ngOnChanges(): void {
    const ctx = this.ctx();
    if (ctx.organizationId) {
      this.form.controls.orgId.setValue(ctx.organizationId);
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
    if (this.parentNode.type === 'METER') {
      this.form.controls.id.setValue(this.parentNode.location_id);
    }

    const meta = this.parentNode.metadata as unknown as Partial<MeterDTO> | null | undefined;
    if (meta) {
      if (typeof meta.meterType === 'string') this.form.controls.meterType.setValue(meta.meterType as MeterType);
      if (typeof meta.serialNumber === 'string') this.form.controls.serialNumber.setValue(meta.serialNumber);
      if (typeof meta.name === 'string') this.form.controls.name.setValue(meta.name);
      if (typeof meta.iotName === 'string') this.form.controls.iotName.setValue(meta.iotName);
      if (typeof meta.protocol === 'string') this.form.controls.protocol.setValue(meta.protocol as MeterProtocol);
      if (typeof meta.isMain === 'boolean') this.form.controls.isMain.setValue(meta.isMain);
      if (typeof meta.assetId === 'string') this.form.controls.assetId.setValue(meta.assetId);
      if (typeof meta.parentMeterId === 'string') this.form.controls.parentMeterId.setValue(meta.parentMeterId);
      if (typeof meta.status === 'string') this.form.controls.status.setValue(meta.status as MeterOperationalStatus);
      if (typeof meta.createdAt === 'string') this.form.controls.createdAt.setValue(meta.createdAt);
      if (typeof meta.updatedAt === 'string') this.form.controls.updatedAt.setValue(meta.updatedAt);
    }

    this.lockChainOfCommand();
    this.lastResetValue = this.form.getRawValue();
    this.form.markAsPristine();
  }

  toggleMain(ev: Event): void {
    const checked = Boolean((ev.target as HTMLInputElement | null)?.checked);
    this.form.controls.isMain.setValue(checked);
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const dto = this.toDTO();
    this.location.lastError.set('Guardando medidor…');
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
      const msg = e instanceof Error ? e.message : 'Error desconocido guardando medidor';
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

  private toDTO(): MeterDTO {
    const v = this.form.getRawValue();
    return {
      id: v.id,
      orgId: v.orgId,
      regionId: v.regionId,
      branchId: v.branchId,
      buildingId: v.buildingId,
      meterType: v.meterType,
      serialNumber: v.serialNumber,
      name: v.name,
      iotName: v.iotName,
      protocol: v.protocol,
      isMain: v.isMain,
      status: v.status,
      ...(v.assetId?.trim() ? { assetId: v.assetId.trim() } : {}),
      ...(v.parentMeterId?.trim() ? { parentMeterId: v.parentMeterId.trim() } : {}),
      ...(v.createdAt ? { createdAt: v.createdAt } : {}),
      ...(v.updatedAt ? { updatedAt: v.updatedAt } : {})
    };
  }
}

