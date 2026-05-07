import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, type FormControl, type FormGroup } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import type { SmsLocationNode } from '../../../../core/models/sms-location-node.model';
import { LocationService } from '../../services/location.service';
import {
  LifecycleStatusSchema,
  type LifecycleStatus,
  type RegionDTO
} from '@sms/common';
import { resolveHierarchyContext } from './location-hierarchy-context';

type RegionFormShape = {
  id: FormControl<string>;
  organizationId: FormControl<string>;
  name: FormControl<string>;
  code: FormControl<string>;
  countryCode: FormControl<string>;
  timezone: FormControl<string>;
  status: FormControl<LifecycleStatus>;
  description: FormControl<string | null>;
  lat: FormControl<number | null>;
  lng: FormControl<number | null>;
  createdAt: FormControl<string | null>;
  updatedAt: FormControl<string | null>;
};

type RegionFormGroup = FormGroup<RegionFormShape>;

interface SelectOption<T> {
  label: string;
  value: T;
}

function optionsOf<T extends string>(values: readonly T[]): SelectOption<T>[] {
  return values.map((v) => ({ label: v, value: v }));
}

@Component({
  selector: 'sms-region-form',
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
    <form class="flex flex-column gap-4 max-w-[980px] mx-auto" [formGroup]="form">
      <p-card styleClass="border-round-2xl shadow-1">
        <ng-template pTemplate="title">Identidad</ng-template>
        <div class="grid grid-cols-12 gap-3">
          <input type="hidden" formControlName="organizationId" />
          <input type="hidden" formControlName="id" />
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">code</label>
            <input pInputText class="w-full" formControlName="code" />
          </div>
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
          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">countryCode</label>
            <input pInputText class="w-full" formControlName="countryCode" placeholder="IL" />
          </div>
          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">timezone</label>
            <input pInputText class="w-full" formControlName="timezone" placeholder="Asia/Jerusalem" />
          </div>
          <div class="col-span-12">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">description</label>
            <input pInputText class="w-full" formControlName="description" placeholder="(optional)" />
          </div>
        </div>
      </p-card>

      <p-card styleClass="border-round-2xl shadow-1">
        <ng-template pTemplate="title">Configuración técnica</ng-template>
        <div class="grid grid-cols-12 gap-3">
          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Latitude</label>
            <p-inputNumber class="w-full" [min]="-90" [max]="90" formControlName="lat" />
          </div>
          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Longitude</label>
            <p-inputNumber class="w-full" [min]="-180" [max]="180" formControlName="lng" />
          </div>
        </div>
      </p-card>

      <div class="flex justify-content-end gap-2">
        <button pButton type="button" label="Reset" icon="pi pi-refresh" severity="secondary" (click)="reset()" [disabled]="!form.dirty"></button>
        <button pButton type="button" label="Save" icon="pi pi-save" (click)="save()" [disabled]="form.invalid || !form.dirty"></button>
        <button
          pButton
          type="button"
          label="DTO preview"
          icon="pi pi-code"
          severity="secondary"
          (click)="togglePreview()"
        ></button>
      </div>
      <pre class="text-xs bg-slate-950 text-slate-100 p-3 rounded-xl overflow-auto" *ngIf="preview()">{{ dtoPreview() }}</pre>
    </form>
  `
})
export class RegionFormComponent {
  @Input({ required: true }) parentNode!: SmsLocationNode;

  readonly preview = signal(false);
  readonly ctx = computed(() => resolveHierarchyContext(this.parentNode));
  private readonly location = inject(LocationService);
  private lastResetValue: ReturnType<RegionFormGroup['getRawValue']> | null = null;
  private lockChainOfCommand(): void {
    this.form.controls.organizationId.disable({ emitEvent: false });
  }

  private readonly fb = new FormBuilder().nonNullable;
  readonly form: RegionFormGroup = this.fb.group({
    id: this.fb.control('', { validators: [Validators.required] }),
    organizationId: this.fb.control('', { validators: [Validators.required] }),
    name: this.fb.control('', { validators: [Validators.required] }),
    code: this.fb.control('', { validators: [Validators.required] }),
    countryCode: this.fb.control('', { validators: [Validators.required] }),
    timezone: this.fb.control('', { validators: [Validators.required] }),
    status: this.fb.control((LifecycleStatusSchema.options[0] ?? 'ACTIVE') as LifecycleStatus, {
      validators: [Validators.required]
    }),
    description: this.fb.control<string | null>(null),
    lat: this.fb.control<number | null>(null),
    lng: this.fb.control<number | null>(null),
    createdAt: this.fb.control<string | null>(null),
    updatedAt: this.fb.control<string | null>(null)
  });

  readonly statusOptions = optionsOf(LifecycleStatusSchema.options as readonly LifecycleStatus[]);

  ngOnChanges(): void {
    const ctx = this.ctx();
    const orgId = ctx.organizationId ?? this.parentNode.metadata?.organizationId ?? '';
    if (orgId) {
      this.form.controls.organizationId.setValue(orgId);
    }
    // Si se edita un nodo REGION ya creado, podemos prellenar su id.
    if (this.parentNode.type === 'REGION' && this.parentNode.location_id) {
      this.form.controls.id.setValue(this.parentNode.location_id);
    }

    const meta = this.parentNode.metadata as unknown as Partial<RegionDTO> | null | undefined;
    if (meta) {
      // Rehidrata el formulario desde metadata guardada en memoria (mock mode).
      if (typeof meta.name === 'string') this.form.controls.name.setValue(meta.name);
      if (typeof meta.code === 'string') this.form.controls.code.setValue(meta.code);
      if (typeof meta.countryCode === 'string') this.form.controls.countryCode.setValue(meta.countryCode);
      if (typeof meta.timezone === 'string') this.form.controls.timezone.setValue(meta.timezone);
      if (meta.status === 'ACTIVE' || meta.status === 'INACTIVE') this.form.controls.status.setValue(meta.status);
      if (typeof meta.description === 'string') this.form.controls.description.setValue(meta.description);

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

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const dto = this.toDTO();
    this.location.lastError.set('Guardando región…');
    try {
      await this.location.updateNode(this.parentNode.location_id, {
        name: dto.name,
        status: dto.status === 'ACTIVE' ? 'ACTIVE' : 'MAINTENANCE',
        metadata: dto
      });
      this.location.lastError.set(null);
      this.lastResetValue = this.form.getRawValue();
      this.form.markAsPristine();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido guardando región';
      this.location.lastError.set(msg);
    }
  }

  reset(): void {
    if (!this.lastResetValue) return;
    this.form.reset(this.lastResetValue, { emitEvent: false });
    this.lockChainOfCommand();
    this.form.markAsPristine();
  }

  dtoPreview(): string {
    return JSON.stringify(this.toDTO(), null, 2);
  }

  togglePreview(): void {
    this.preview.update((x) => !x);
  }

  private toDTO(): RegionDTO {
    const v = this.form.getRawValue();
    const hasCoords = v.lat != null && v.lng != null;
    return {
      id: v.id,
      organizationId: v.organizationId,
      name: v.name,
      code: v.code,
      countryCode: v.countryCode,
      timezone: v.timezone,
      status: v.status,
      ...(v.description?.trim() ? { description: v.description.trim() } : {}),
      ...(hasCoords ? { coordinates: { lat: v.lat as number, lng: v.lng as number } } : {}),
      ...(v.createdAt ? { createdAt: v.createdAt } : {}),
      ...(v.updatedAt ? { updatedAt: v.updatedAt } : {})
    };
  }
}

