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
  IndustrySectorSchema,
  CurrencyCodeSchema,
  ReportingCurrencyCodeSchema,
  SubscriptionPlanSchema,
  LifecycleStatusSchema,
  type OrganizationDTO,
  type LifecycleStatus,
  type CurrencyCode,
  type ReportingCurrencyCode,
  type IndustrySector,
  type SubscriptionPlan
} from '@sms/common';
import { resolveHierarchyContext } from './location-hierarchy-context';

type OrgFormShape = {
  orgId: FormControl<string>;
  name: FormControl<string>;
  legalName: FormControl<string>;
  websiteUrl: FormControl<string | null>;
  logoUrl: FormControl<string | null>;
  primaryLanguage: FormControl<string>;
  unitSystem: FormControl<'METRIC' | 'IMPERIAL'>;
  defaultTimeZone: FormControl<string>;
  fiscalYearStart: FormControl<number>;
  adminName: FormControl<string>;
  adminEmail: FormControl<string>;
  adminPhone: FormControl<string>;
  esgFrameworks: FormControl<string>;
  taxId: FormControl<string>;
  hqAddress: FormControl<string>;
  totalGlobalM2: FormControl<number>;
  industrySector: FormControl<IndustrySector>;
  currency: FormControl<CurrencyCode>;
  reportingCurrency: FormControl<ReportingCurrencyCode>;
  minConfidence: FormControl<number>;
  baselineYear: FormControl<number>;
  reductionTarget: FormControl<number>;
  targetYear: FormControl<number>;
  subscriptionPlan: FormControl<SubscriptionPlan>;
  status: FormControl<LifecycleStatus>;
  createdAt: FormControl<string | null>;
  updatedAt: FormControl<string | null>;
};

type OrgFormGroup = FormGroup<OrgFormShape>;

interface SelectOption<T> {
  label: string;
  value: T;
}

function optionsOf<T extends string>(values: readonly T[]): SelectOption<T>[] {
  return values.map((v) => ({ label: v, value: v }));
}

@Component({
  selector: 'sms-organization-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardModule, ButtonModule, InputTextModule, InputNumberModule, DropdownModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="flex flex-column gap-4 max-w-[980px] mx-auto" [formGroup]="form">
      <p-card styleClass="border-round-2xl shadow-1">
        <ng-template pTemplate="title">Identidad</ng-template>
        <div class="grid grid-cols-12 gap-3">
          <input type="hidden" formControlName="orgId" />
          <div class="col-span-12 md:col-span-8">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Name</label>
            <input pInputText class="w-full" formControlName="name" />
          </div>
          <div class="col-span-12 md:col-span-8">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Legal name</label>
            <input pInputText class="w-full" formControlName="legalName" />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Website (optional)</label>
            <input pInputText class="w-full" formControlName="websiteUrl" placeholder="https://…" />
          </div>
          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Logo URL (optional)</label>
            <input pInputText class="w-full" formControlName="logoUrl" placeholder="https://…" />
          </div>
          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Tax ID</label>
            <input pInputText class="w-full" formControlName="taxId" />
          </div>
          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">HQ address</label>
            <input pInputText class="w-full" formControlName="hqAddress" />
          </div>
        </div>
      </p-card>

      <p-card styleClass="border-round-2xl shadow-1">
        <ng-template pTemplate="title">Dimensiones y operación</ng-template>
        <div class="grid grid-cols-12 gap-3">
          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Total global surface (m²)</label>
            <p-inputNumber class="w-full" [min]="0" formControlName="totalGlobalM2" />
          </div>
          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Min confidence (0..1)</label>
            <p-inputNumber class="w-full" [min]="0" [max]="1" [step]="0.01" formControlName="minConfidence" />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Baseline year</label>
            <p-inputNumber class="w-full" [useGrouping]="false" formControlName="baselineYear" />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Reduction target</label>
            <p-inputNumber class="w-full" [min]="0" formControlName="reductionTarget" />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Target year</label>
            <p-inputNumber class="w-full" [useGrouping]="false" formControlName="targetYear" />
          </div>
        </div>
      </p-card>

      <p-card styleClass="border-round-2xl shadow-1">
        <ng-template pTemplate="title">Configuración</ng-template>
        <div class="grid grid-cols-12 gap-3">
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Primary language (ISO 639-1)</label>
            <p-dropdown
              [options]="primaryLanguageOptions"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full border-round-xl"
              appendTo="body"
              formControlName="primaryLanguage"
            ></p-dropdown>
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Unit system</label>
            <p-dropdown
              [options]="unitSystemOptions"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full border-round-xl"
              appendTo="body"
              formControlName="unitSystem"
            ></p-dropdown>
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Default time zone</label>
            <input pInputText class="w-full" formControlName="defaultTimeZone" placeholder="UTC" />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Fiscal year start (1-12)</label>
            <p-inputNumber class="w-full" [min]="1" [max]="12" [useGrouping]="false" formControlName="fiscalYearStart" />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Industry sector</label>
            <p-dropdown
              [options]="industrySectorOptions"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full border-round-xl"
              appendTo="body"
              formControlName="industrySector"
            ></p-dropdown>
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Currency</label>
            <p-dropdown
              [options]="currencyOptions"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full border-round-xl"
              appendTo="body"
              formControlName="currency"
            ></p-dropdown>
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Reporting currency</label>
            <p-dropdown
              [options]="reportingCurrencyOptions"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full border-round-xl"
              appendTo="body"
              formControlName="reportingCurrency"
            ></p-dropdown>
          </div>
          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Subscription plan</label>
            <p-dropdown
              [options]="subscriptionPlanOptions"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full border-round-xl"
              appendTo="body"
              formControlName="subscriptionPlan"
            ></p-dropdown>
          </div>
          <div class="col-span-12 md:col-span-6">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Lifecycle status</label>
            <p-dropdown
              [options]="lifecycleStatusOptions"
              optionLabel="label"
              optionValue="value"
              styleClass="w-full border-round-xl"
              appendTo="body"
              formControlName="status"
            ></p-dropdown>
          </div>
        </div>
      </p-card>

      <p-card styleClass="border-round-2xl shadow-1">
        <ng-template pTemplate="title">Contacto administrativo</ng-template>
        <div class="grid grid-cols-12 gap-3">
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Admin name</label>
            <input pInputText class="w-full" formControlName="adminName" />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Admin email</label>
            <input pInputText class="w-full" formControlName="adminEmail" />
          </div>
          <div class="col-span-12 md:col-span-4">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">Admin phone</label>
            <input pInputText class="w-full" formControlName="adminPhone" />
          </div>
        </div>
      </p-card>

      <p-card styleClass="border-round-2xl shadow-1">
        <ng-template pTemplate="title">Gobernanza ESG</ng-template>
        <div class="grid grid-cols-12 gap-3">
          <div class="col-span-12">
            <label class="block text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">ESG frameworks (comma-separated)</label>
            <input pInputText class="w-full" formControlName="esgFrameworks" placeholder="GRI, SASB" />
          </div>
        </div>
      </p-card>

      <div class="flex justify-content-end gap-2">
        <button pButton type="button" label="Reset" icon="pi pi-refresh" severity="secondary" (click)="reset()" [disabled]="!form.dirty"></button>
        <button pButton type="button" label="Save" icon="pi pi-save" (click)="save()" [disabled]="form.invalid || !form.dirty"></button>
        <button pButton type="button" label="DTO preview" icon="pi pi-code" (click)="togglePreview()" severity="secondary"></button>
      </div>

      <pre class="text-xs bg-slate-950 text-slate-100 p-3 rounded-xl overflow-auto" *ngIf="preview()">{{ dtoPreview() }}</pre>
    </form>
  `
})
export class OrganizationFormComponent {
  @Input({ required: true }) parentNode!: SmsLocationNode;

  readonly ctx = computed(() => resolveHierarchyContext(this.parentNode));
  private readonly location = inject(LocationService);

  private readonly fb = new FormBuilder().nonNullable;
  readonly form: OrgFormGroup = this.fb.group({
    orgId: this.fb.control('', { validators: [Validators.required] }),
    name: this.fb.control('', { validators: [Validators.required] }),
    legalName: this.fb.control('', { validators: [Validators.required] }),
    websiteUrl: this.fb.control<string | null>(null),
    logoUrl: this.fb.control<string | null>(null),
    primaryLanguage: this.fb.control('en', { validators: [Validators.required, Validators.pattern(/^[a-z]{2}$/)] }),
    unitSystem: this.fb.control<'METRIC' | 'IMPERIAL'>('METRIC', { validators: [Validators.required] }),
    defaultTimeZone: this.fb.control('UTC', { validators: [Validators.required] }),
    fiscalYearStart: this.fb.control(1, { validators: [Validators.required, Validators.min(1), Validators.max(12)] }),
    adminName: this.fb.control('N/A', { validators: [Validators.required] }),
    adminEmail: this.fb.control('N/A', { validators: [Validators.required] }),
    adminPhone: this.fb.control('N/A', { validators: [Validators.required] }),
    esgFrameworks: this.fb.control('', { validators: [Validators.required] }),
    taxId: this.fb.control('', { validators: [Validators.required] }),
    hqAddress: this.fb.control('', { validators: [Validators.required] }),
    totalGlobalM2: this.fb.control(0, { validators: [Validators.required, Validators.min(0)] }),
    industrySector: this.fb.control((IndustrySectorSchema.options[0] ?? 'MANUFACTURING') as IndustrySector, {
      validators: [Validators.required]
    }),
    currency: this.fb.control((CurrencyCodeSchema.options[0] ?? 'ILS') as CurrencyCode, { validators: [Validators.required] }),
    reportingCurrency: this.fb.control((ReportingCurrencyCodeSchema.options[0] ?? 'USD') as ReportingCurrencyCode, {
      validators: [Validators.required]
    }),
    minConfidence: this.fb.control(0.85, {
      validators: [Validators.required, Validators.min(0), Validators.max(1)]
    }),
    baselineYear: this.fb.control(new Date().getFullYear(), { validators: [Validators.required] }),
    reductionTarget: this.fb.control(0, { validators: [Validators.required, Validators.min(0)] }),
    targetYear: this.fb.control(new Date().getFullYear(), { validators: [Validators.required] }),
    subscriptionPlan: this.fb.control((SubscriptionPlanSchema.options[0] ?? 'ENTERPRISE') as SubscriptionPlan, {
      validators: [Validators.required]
    }),
    status: this.fb.control((LifecycleStatusSchema.options[0] ?? 'ACTIVE') as LifecycleStatus, { validators: [Validators.required] }),
    createdAt: this.fb.control<string | null>(null),
    updatedAt: this.fb.control<string | null>(null)
  });

  readonly industrySectorOptions = optionsOf(IndustrySectorSchema.options as readonly IndustrySector[]);
  readonly currencyOptions = optionsOf(CurrencyCodeSchema.options as readonly CurrencyCode[]);
  readonly reportingCurrencyOptions = optionsOf(ReportingCurrencyCodeSchema.options as readonly ReportingCurrencyCode[]);
  readonly subscriptionPlanOptions = optionsOf(SubscriptionPlanSchema.options as readonly SubscriptionPlan[]);
  readonly lifecycleStatusOptions = optionsOf(LifecycleStatusSchema.options as readonly LifecycleStatus[]);
  readonly unitSystemOptions: Array<SelectOption<'METRIC' | 'IMPERIAL'>> = [
    { label: 'METRIC', value: 'METRIC' },
    { label: 'IMPERIAL', value: 'IMPERIAL' }
  ];

  readonly primaryLanguageOptions: Array<SelectOption<string>> = [
    { label: 'English (en)', value: 'en' },
    { label: 'Español (es)', value: 'es' },
    { label: 'Hebrew (he)', value: 'he' },
    { label: 'Português (pt)', value: 'pt' },
    { label: 'Français (fr)', value: 'fr' }
  ];

  readonly preview = signal(false);
  private lastResetValue: ReturnType<OrgFormGroup['getRawValue']> | null = null;
  private lockChainOfCommand(): void {
    this.form.controls.orgId.disable({ emitEvent: false });
  }

  ngOnChanges(): void {
    const orgId = this.ctx().organizationId ?? this.parentNode.location_id;
    this.form.controls.orgId.setValue(orgId);

    const meta = this.parentNode.metadata as unknown as Partial<OrganizationDTO> | null | undefined;
    if (meta) {
      // Rehidrata el formulario desde metadata guardada en memoria (mock mode).
      // No tocamos orgId aquí; se deriva de la jerarquía.
      if (typeof meta.name === 'string') this.form.controls.name.setValue(meta.name);
      if (typeof meta.legalName === 'string') this.form.controls.legalName.setValue(meta.legalName);
      if (typeof meta.websiteUrl === 'string') this.form.controls.websiteUrl.setValue(meta.websiteUrl);
      if (typeof meta.logoUrl === 'string') this.form.controls.logoUrl.setValue(meta.logoUrl);
      if (typeof meta.primaryLanguage === 'string') this.form.controls.primaryLanguage.setValue(meta.primaryLanguage);
      if (meta.unitSystem === 'METRIC' || meta.unitSystem === 'IMPERIAL') this.form.controls.unitSystem.setValue(meta.unitSystem);
      if (typeof meta.defaultTimeZone === 'string') this.form.controls.defaultTimeZone.setValue(meta.defaultTimeZone);
      if (typeof meta.fiscalYearStart === 'number') this.form.controls.fiscalYearStart.setValue(meta.fiscalYearStart);
      if (typeof meta.taxId === 'string') this.form.controls.taxId.setValue(meta.taxId);
      if (typeof meta.hqAddress === 'string') this.form.controls.hqAddress.setValue(meta.hqAddress);
      if (typeof meta.totalGlobalM2 === 'number') this.form.controls.totalGlobalM2.setValue(meta.totalGlobalM2);
      if (typeof meta.industrySector === 'string')
        this.form.controls.industrySector.setValue(meta.industrySector as IndustrySector);
      if (typeof meta.currency === 'string') this.form.controls.currency.setValue(meta.currency as CurrencyCode);
      if (typeof meta.reportingCurrency === 'string')
        this.form.controls.reportingCurrency.setValue(meta.reportingCurrency as ReportingCurrencyCode);
      if (typeof meta.minConfidence === 'number') this.form.controls.minConfidence.setValue(meta.minConfidence);
      if (typeof meta.baselineYear === 'number') this.form.controls.baselineYear.setValue(meta.baselineYear);
      if (typeof meta.reductionTarget === 'number') this.form.controls.reductionTarget.setValue(meta.reductionTarget);
      if (typeof meta.targetYear === 'number') this.form.controls.targetYear.setValue(meta.targetYear);
      if (typeof meta.subscriptionPlan === 'string')
        this.form.controls.subscriptionPlan.setValue(meta.subscriptionPlan as SubscriptionPlan);
      if (meta.status === 'ACTIVE' || meta.status === 'INACTIVE') this.form.controls.status.setValue(meta.status);

      if (meta.adminContact) {
        if (typeof meta.adminContact.name === 'string') this.form.controls.adminName.setValue(meta.adminContact.name);
        if (typeof meta.adminContact.email === 'string') this.form.controls.adminEmail.setValue(meta.adminContact.email);
        if (typeof meta.adminContact.phone === 'string') this.form.controls.adminPhone.setValue(meta.adminContact.phone);
      }

      if (Array.isArray(meta.esgFrameworks)) {
        const list = meta.esgFrameworks.filter((x): x is string => typeof x === 'string' && Boolean(x.trim()));
        this.form.controls.esgFrameworks.setValue(list.join(', '));
      }

      if (typeof meta.createdAt === 'string') this.form.controls.createdAt.setValue(meta.createdAt);
      if (typeof meta.updatedAt === 'string') this.form.controls.updatedAt.setValue(meta.updatedAt);
    }

    // razonable default: si legalName no está, igualarlo a name
    if (!this.form.controls.legalName.value?.trim() && this.form.controls.name.value?.trim()) {
      this.form.controls.legalName.setValue(this.form.controls.name.value);
    }
    this.lockChainOfCommand();
    this.lastResetValue = this.form.getRawValue();
    this.form.markAsPristine();
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const dto = this.toDTO();
    this.location.lastError.set('Guardando organización…');
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
      const msg = e instanceof Error ? e.message : 'Error desconocido guardando organización';
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
    const dto = this.toDTO();
    return JSON.stringify(dto, null, 2);
  }

  set<K extends keyof OrgFormShape>(key: K, value: OrgFormShape[K] extends FormControl<infer T> ? T : never): void {
    (this.form.controls[key] as unknown as FormControl<unknown>).setValue(value as unknown);
  }

  private toDTO(): OrganizationDTO {
    const v = this.form.getRawValue();
    return {
      orgId: v.orgId,
      name: v.name,
      legalName: v.legalName,
      ...(v.websiteUrl?.trim() ? { websiteUrl: v.websiteUrl.trim() } : {}),
      ...(v.logoUrl?.trim() ? { logoUrl: v.logoUrl.trim() } : {}),
      primaryLanguage: v.primaryLanguage,
      unitSystem: v.unitSystem,
      defaultTimeZone: v.defaultTimeZone,
      fiscalYearStart: v.fiscalYearStart,
      adminContact: { name: v.adminName, email: v.adminEmail, phone: v.adminPhone },
      esgFrameworks: v.esgFrameworks
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      taxId: v.taxId,
      hqAddress: v.hqAddress,
      totalGlobalM2: v.totalGlobalM2,
      industrySector: v.industrySector,
      currency: v.currency,
      reportingCurrency: v.reportingCurrency,
      minConfidence: v.minConfidence,
      baselineYear: v.baselineYear,
      reductionTarget: v.reductionTarget,
      targetYear: v.targetYear,
      subscriptionPlan: v.subscriptionPlan,
      status: v.status,
      ...(v.createdAt ? { createdAt: v.createdAt } : {}),
      ...(v.updatedAt ? { updatedAt: v.updatedAt } : {})
    };
  }
}

