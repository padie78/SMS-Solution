import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, Input, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import type { SmsLocationNode, SmsNodeStatus } from '../../../../../core/models/sms-location-node.model';
import { LocationService } from '../../../services/location.service';

interface StatusOption {
  label: string;
  value: SmsNodeStatus;
}

@Component({
  selector: 'sms-dynamic-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    DropdownModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-column gap-3 w-full max-w-[980px] mx-auto" *ngIf="node(); else empty">
      <form
        [formGroup]="form"
        class="w-full grid grid-cols-12 gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4"
      >
        <div class="col-span-12 flex flex-wrap align-items-center justify-content-between gap-2 mb-1">
          <div class="flex align-items-center gap-2 min-w-0">
            <span class="inline-flex align-items-center justify-content-center w-7 h-7 rounded-lg bg-emerald-600 text-white">
              <i class="pi pi-leaf text-xs"></i>
            </span>
            <div class="min-w-0">
              <div class="text-xs font-black uppercase tracking-wider text-emerald-900">Core fields</div>
              <div class="text-[11px] text-emerald-800/80">Edita y guarda cambios auditables.</div>
            </div>
          </div>
          <div class="text-xs text-emerald-900/80">
            {{ node()?.type }} · <span class="font-mono font-bold">{{ node()?.location_id }}</span>
          </div>
        </div>

        <div class="col-span-12 md:col-span-8">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Name</label>
          <input pInputText class="w-full" formControlName="name" />
        </div>

        <div class="col-span-12 md:col-span-4">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Status</label>
          <p-dropdown
            [options]="statusOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            appendTo="body"
            formControlName="status"
          />
        </div>

        <!-- RegionDTO -->
        <div class="col-span-12 md:col-span-6" *ngIf="showField('code')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Code</label>
          <input pInputText class="w-full" formControlName="code" placeholder="(optional)" />
        </div>

        <!-- BranchDTO -->
        <div class="col-span-12 md:col-span-6" *ngIf="showField('timezone')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Timezone</label>
          <input pInputText class="w-full" formControlName="timezone" placeholder="e.g. Asia/Jerusalem" />
        </div>
        <div class="col-span-12 md:col-span-6" *ngIf="showField('facilityType')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Facility type</label>
          <input pInputText class="w-full" formControlName="facilityType" placeholder="e.g. MANUFACTURING" />
        </div>
        <div class="col-span-12 md:col-span-6" *ngIf="showField('m2Surface')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Surface (m²)</label>
          <p-inputNumber class="w-full" formControlName="m2Surface" [min]="0" />
        </div>
        <div class="col-span-12 md:col-span-6" *ngIf="showField('regionLabel')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Region label</label>
          <input pInputText class="w-full" formControlName="regionLabel" placeholder="(optional)" />
        </div>

        <!-- BuildingDTO -->
        <div class="col-span-12 md:col-span-6" *ngIf="showField('usageType')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Usage type</label>
          <input pInputText class="w-full" formControlName="usageType" placeholder="(optional)" />
        </div>
        <div class="col-span-12 md:col-span-6" *ngIf="showField('usageTypeEnum')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Usage type (enum)</label>
          <input pInputText class="w-full" formControlName="usageTypeEnum" placeholder="e.g. STORAGE_INDUSTRIAL" />
        </div>
        <div class="col-span-12 md:col-span-6" *ngIf="showField('operationalStatus')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Operational status</label>
          <input pInputText class="w-full" formControlName="operationalStatus" placeholder="e.g. OPERATIONAL" />
        </div>
        <div class="col-span-12 md:col-span-6" *ngIf="showField('yearBuilt')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Year built</label>
          <p-inputNumber class="w-full" formControlName="yearBuilt" [useGrouping]="false" />
        </div>
        <div class="col-span-12 md:col-span-6" *ngIf="showField('m3Volume')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Volume (m³)</label>
          <p-inputNumber class="w-full" formControlName="m3Volume" [min]="0" />
        </div>
        <div class="col-span-12 md:col-span-6" *ngIf="showField('hvacType')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">HVAC type</label>
          <input pInputText class="w-full" formControlName="hvacType" placeholder="e.g. CENTRAL_CHILLER" />
        </div>
        <div class="col-span-12 md:col-span-6" *ngIf="showField('hasBms')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Has BMS</label>
          <input pInputText class="w-full" formControlName="hasBms" placeholder="true/false" />
        </div>

        <!-- CostCenterDTO -->
        <div class="col-span-12 md:col-span-6" *ngIf="showField('allocationMethod')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Allocation method</label>
          <input pInputText class="w-full" formControlName="allocationMethod" placeholder="e.g. SQUARE_METERS" />
        </div>
        <div class="col-span-12 md:col-span-6" *ngIf="showField('percentage')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Percentage</label>
          <p-inputNumber class="w-full" formControlName="percentage" [min]="0" [max]="100" />
        </div>
        <div class="col-span-12 md:col-span-6" *ngIf="showField('annualBudget')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Annual budget</label>
          <p-inputNumber class="w-full" formControlName="annualBudget" [min]="0" />
        </div>

        <!-- AssetDTO -->
        <div class="col-span-12 md:col-span-6" *ngIf="showField('assetType')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Asset type</label>
          <input pInputText class="w-full" formControlName="assetType" placeholder="HVAC / LIGHTING / …" />
        </div>
        <div class="col-span-12 md:col-span-6" *ngIf="showField('assetStatus')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Asset status</label>
          <input pInputText class="w-full" formControlName="assetStatus" placeholder="OPERATIONAL / MAINTENANCE / …" />
        </div>
        <div class="col-span-12 md:col-span-6" *ngIf="showField('nominalPower')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Nominal power</label>
          <p-inputNumber class="w-full" formControlName="nominalPower" [min]="0" [maxFractionDigits]="3" />
        </div>

        <!-- MeterDTO -->
        <div class="col-span-12 md:col-span-6" *ngIf="showField('meterType')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Meter type</label>
          <input pInputText class="w-full" formControlName="meterType" placeholder="ELECTRICITY / WATER / GAS" />
        </div>
        <div class="col-span-12 md:col-span-6" *ngIf="showField('serialNumber')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Serial number</label>
          <input pInputText class="w-full" formControlName="serialNumber" />
        </div>
        <div class="col-span-12 md:col-span-6" *ngIf="showField('iotName')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">IoT name</label>
          <input pInputText class="w-full" formControlName="iotName" />
        </div>
        <div class="col-span-12 md:col-span-6" *ngIf="showField('protocol')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Protocol</label>
          <input pInputText class="w-full" formControlName="protocol" placeholder="e.g. MQTT" />
        </div>
        <div class="col-span-12 md:col-span-6" *ngIf="showField('isMain')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Is main</label>
          <input pInputText class="w-full" formControlName="isMain" placeholder="true/false" />
        </div>

        <!-- Legacy / prototype -->
        <div class="col-span-12 md:col-span-6" *ngIf="showField('cups')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">CUPS</label>
          <input pInputText class="w-full" formControlName="cups" />
        </div>
        <div class="col-span-12 md:col-span-6" *ngIf="showField('nominalPower_kw')">
          <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Nominal power (kW)</label>
          <p-inputNumber
            class="w-full"
            formControlName="nominalPower_kw"
            [minFractionDigits]="0"
            [maxFractionDigits]="3"
          />
        </div>
      </form>

      <div class="flex flex-wrap justify-content-end gap-2">
        <p-button
          type="button"
          label="Reset"
          icon="pi pi-undo"
          (onClick)="reset()"
          [disabled]="!form.dirty"
          styleClass="w-full sm:w-auto min-w-[10rem] justify-content-center border-round-xl text-xs font-bold p-button-outlined border-emerald-200 text-emerald-800 hover:bg-emerald-50"
        />
        <p-button
          type="button"
          label="Save"
          icon="pi pi-save"
          (onClick)="save()"
          [disabled]="!canSave()"
          [loading]="saving()"
          styleClass="w-full sm:w-auto min-w-[10rem] justify-content-center border-round-xl text-xs font-bold bg-emerald-600 border-emerald-600 hover:bg-emerald-700 hover:border-emerald-700"
        />
      </div>
    </div>

    <ng-template #empty>
      <div class="text-500 text-sm">Select a node to edit its details.</div>
    </ng-template>
  `
})
export class DynamicFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly location = inject(LocationService);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) node!: () => SmsLocationNode | null;

  readonly saving = signal(false);

  readonly statusOptions: StatusOption[] = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Alert', value: 'ALERT' },
    { label: 'Maintenance', value: 'MAINTENANCE' }
  ];

  readonly form = this.fb.group({
    name: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    status: this.fb.control<SmsNodeStatus>('ACTIVE', { nonNullable: true }),
    cups: this.fb.control<string | null>(null),
    serialNumber: this.fb.control<string | null>(null),
    iotName: this.fb.control<string | null>(null),
    protocol: this.fb.control<string | null>(null),
    nominalPower_kw: this.fb.control<number | null>(null),
    // RegionDTO
    code: this.fb.control<string | null>(null),
    // BranchDTO
    timezone: this.fb.control<string | null>(null),
    facilityType: this.fb.control<string | null>(null),
    m2Surface: this.fb.control<number | null>(null),
    regionLabel: this.fb.control<string | null>(null),
    // BuildingDTO
    usageType: this.fb.control<string | null>(null),
    usageTypeEnum: this.fb.control<string | null>(null),
    operationalStatus: this.fb.control<string | null>(null),
    yearBuilt: this.fb.control<number | null>(null),
    m3Volume: this.fb.control<number | null>(null),
    hvacType: this.fb.control<string | null>(null),
    hasBms: this.fb.control<string | null>(null),
    // CostCenterDTO
    allocationMethod: this.fb.control<string | null>(null),
    percentage: this.fb.control<number | null>(null),
    annualBudget: this.fb.control<number | null>(null),
    // AssetDTO
    assetType: this.fb.control<string | null>(null),
    assetStatus: this.fb.control<string | null>(null),
    nominalPower: this.fb.control<number | null>(null),
    // MeterDTO
    meterType: this.fb.control<string | null>(null),
    isMain: this.fb.control<string | null>(null),
  });

  private readonly activeFields = signal<Set<string>>(new Set(['name', 'status']));

  constructor() {
    effect(
      () => {
        const n = this.node();
        if (!n) return;
        const fields = this.fieldsForType(n.type);
        this.activeFields.set(fields);
        this.form.reset(
          {
            name: n.name ?? '',
            status: n.status ?? 'ACTIVE',
            cups: n.metadata?.cups ?? null,
            serialNumber: n.metadata?.serialNumber ?? null,
            iotName: n.metadata?.iotName ?? null,
            protocol: n.metadata?.protocol ?? null,
            nominalPower_kw: n.metadata?.nominalPower_kw ?? null,
            code: n.metadata?.code ?? null,
            timezone: n.metadata?.timezone ?? null,
            facilityType: n.metadata?.facilityType ?? null,
            m2Surface: n.metadata?.m2Surface ?? null,
            regionLabel: n.metadata?.regionLabel ?? null,
            usageType: n.metadata?.usageType ?? null,
            usageTypeEnum: n.metadata?.usageTypeEnum ?? null,
            operationalStatus: n.metadata?.operationalStatus ?? null,
            yearBuilt: n.metadata?.yearBuilt ?? null,
            m3Volume: n.metadata?.m3Volume ?? null,
            hvacType: n.metadata?.hvacType ?? null,
            hasBms: n.metadata?.hasBms == null ? null : n.metadata?.hasBms ? 'true' : 'false',
            allocationMethod: n.metadata?.allocationMethod ?? null,
            percentage: n.metadata?.percentage ?? null,
            annualBudget: n.metadata?.annualBudget ?? null,
            assetType: n.metadata?.assetType ?? null,
            assetStatus: n.metadata?.assetStatus ?? null,
            nominalPower: n.metadata?.nominalPower ?? null,
            meterType: n.metadata?.meterType ?? null,
            isMain: n.metadata?.isMain == null ? null : n.metadata?.isMain ? 'true' : 'false',
          },
          { emitEvent: false }
        );
        this.form.markAsPristine();
      },
      { allowSignalWrites: true }
    );

    // If node changes while saving, avoid stale saves.
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      // noop; just ensures CD updates for OnPush parent contexts
    });
  }

  showField(key: string): boolean {
    return this.activeFields().has(key);
  }

  canSave(): boolean {
    return this.form.valid && this.form.dirty && !this.saving();
  }

  reset(): void {
    const n = this.node();
    if (!n) return;
    this.form.reset(
      {
        name: n.name ?? '',
        status: n.status ?? 'ACTIVE',
        cups: n.metadata?.cups ?? null,
        serialNumber: n.metadata?.serialNumber ?? null,
        iotName: n.metadata?.iotName ?? null,
        protocol: n.metadata?.protocol ?? null,
        nominalPower_kw: n.metadata?.nominalPower_kw ?? null,
        code: n.metadata?.code ?? null,
        timezone: n.metadata?.timezone ?? null,
        facilityType: n.metadata?.facilityType ?? null,
        m2Surface: n.metadata?.m2Surface ?? null,
        regionLabel: n.metadata?.regionLabel ?? null,
        usageType: n.metadata?.usageType ?? null,
        usageTypeEnum: n.metadata?.usageTypeEnum ?? null,
        operationalStatus: n.metadata?.operationalStatus ?? null,
        yearBuilt: n.metadata?.yearBuilt ?? null,
        m3Volume: n.metadata?.m3Volume ?? null,
        hvacType: n.metadata?.hvacType ?? null,
        hasBms: n.metadata?.hasBms == null ? null : n.metadata?.hasBms ? 'true' : 'false',
        allocationMethod: n.metadata?.allocationMethod ?? null,
        percentage: n.metadata?.percentage ?? null,
        annualBudget: n.metadata?.annualBudget ?? null,
        assetType: n.metadata?.assetType ?? null,
        assetStatus: n.metadata?.assetStatus ?? null,
        nominalPower: n.metadata?.nominalPower ?? null,
        meterType: n.metadata?.meterType ?? null,
        isMain: n.metadata?.isMain == null ? null : n.metadata?.isMain ? 'true' : 'false',
      },
      { emitEvent: false }
    );
    this.form.markAsPristine();
  }

  async save(): Promise<void> {
    const n = this.node();
    if (!n) return;
    if (!this.canSave()) return;

    this.saving.set(true);
    try {
      const raw = this.form.getRawValue();
      const parseBool = (v: string | null): boolean | null => {
        const s = (v ?? '').trim().toLowerCase();
        if (!s) return null;
        if (s === 'true' || s === '1' || s === 'yes') return true;
        if (s === 'false' || s === '0' || s === 'no') return false;
        return null;
      };
      await this.location.updateNode(n.location_id, {
        name: raw.name,
        status: raw.status,
        metadata: {
          ...(n.metadata ?? {}),
          code: this.showField('code') ? raw.code : n.metadata?.code ?? null,
          regionLabel: this.showField('regionLabel') ? raw.regionLabel : n.metadata?.regionLabel ?? null,
          cups: this.showField('cups') ? raw.cups : n.metadata?.cups ?? null,
          serialNumber: this.showField('serialNumber') ? raw.serialNumber : n.metadata?.serialNumber ?? null,
          iotName: this.showField('iotName') ? raw.iotName : n.metadata?.iotName ?? null,
          protocol: this.showField('protocol') ? raw.protocol : n.metadata?.protocol ?? null,
          nominalPower_kw: this.showField('nominalPower_kw') ? raw.nominalPower_kw : n.metadata?.nominalPower_kw ?? null,
          timezone: this.showField('timezone') ? raw.timezone : n.metadata?.timezone ?? null,
          facilityType: this.showField('facilityType') ? raw.facilityType : n.metadata?.facilityType ?? null,
          usageType: this.showField('usageType') ? raw.usageType : n.metadata?.usageType ?? null,
          yearBuilt: this.showField('yearBuilt') ? raw.yearBuilt : n.metadata?.yearBuilt ?? null,
          m2Surface: this.showField('m2Surface') ? raw.m2Surface : n.metadata?.m2Surface ?? null,
          m3Volume: this.showField('m3Volume') ? raw.m3Volume : n.metadata?.m3Volume ?? null,
          usageTypeEnum: this.showField('usageTypeEnum') ? raw.usageTypeEnum : n.metadata?.usageTypeEnum ?? null,
          operationalStatus: this.showField('operationalStatus') ? raw.operationalStatus : n.metadata?.operationalStatus ?? null,
          hvacType: this.showField('hvacType') ? raw.hvacType : n.metadata?.hvacType ?? null,
          hasBms: this.showField('hasBms') ? parseBool(raw.hasBms) : n.metadata?.hasBms ?? null,
          allocationMethod: this.showField('allocationMethod') ? raw.allocationMethod : n.metadata?.allocationMethod ?? null,
          percentage: this.showField('percentage') ? raw.percentage : n.metadata?.percentage ?? null,
          annualBudget: this.showField('annualBudget') ? raw.annualBudget : n.metadata?.annualBudget ?? null,
          assetType: this.showField('assetType') ? raw.assetType : n.metadata?.assetType ?? null,
          assetStatus: this.showField('assetStatus') ? raw.assetStatus : n.metadata?.assetStatus ?? null,
          nominalPower: this.showField('nominalPower') ? raw.nominalPower : n.metadata?.nominalPower ?? null,
          meterType: this.showField('meterType') ? raw.meterType : n.metadata?.meterType ?? null,
          isMain: this.showField('isMain') ? parseBool(raw.isMain) : n.metadata?.isMain ?? null
        }
      });
      this.form.markAsPristine();
    } finally {
      this.saving.set(false);
    }
  }

  private fieldsForType(type: SmsLocationNode['type']): Set<string> {
    if (type === 'REGION') return new Set(['name', 'status', 'code']);
    if (type === 'BRANCH') return new Set(['name', 'status', 'timezone', 'facilityType', 'm2Surface', 'regionLabel']);
    if (type === 'BUILDING')
      return new Set([
        'name',
        'status',
        'usageType',
        'usageTypeEnum',
        'operationalStatus',
        'yearBuilt',
        'm2Surface',
        'm3Volume',
        'hvacType',
        'hasBms'
      ]);
    if (type === 'COST_CENTER') return new Set(['name', 'status', 'allocationMethod', 'percentage', 'annualBudget']);
    if (type === 'ASSET') return new Set(['name', 'status', 'assetType', 'assetStatus', 'nominalPower', 'nominalPower_kw']);
    if (type === 'METER')
      return new Set(['name', 'status', 'meterType', 'serialNumber', 'iotName', 'protocol', 'isMain', 'cups']);
    return new Set(['name', 'status']);
  }
}

