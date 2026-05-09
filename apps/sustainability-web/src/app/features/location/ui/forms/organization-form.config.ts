/**
 * Definición declarativa del formulario de organización.
 * Alineado con @sms/common OrganizationDTOSchema / OrgConfigDTOSchema y OrganizationDTO clase.
 */

import type { ValidatorFn } from '@angular/forms';
import { Validators } from '@angular/forms';
import type { FormBuilder, FormControl, FormGroup } from '@angular/forms';

import type { OrganizationDTO } from '@sms/common';
import { withHelp } from './form-help.util';
import {
  CurrencyCodeSchema,
  IndustrySectorSchema,
  LifecycleStatusSchema,
  ReportingCurrencyCodeSchema,
  SubscriptionPlanSchema,
  parseOrganizationDTO,
  type CurrencyCode,
  type IndustrySector,
  type LifecycleStatus,
  type ReportingCurrencyCode,
  type SubscriptionPlan
} from '@sms/common';

/** Claves planas del FormGroup (adminContact y esg desanidados donde aplica UX). */
export type OrganizationFormValue = {
  orgId: string;
  name: string;
  legalName: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  primaryLanguage: string;
  unitSystem: 'METRIC' | 'IMPERIAL';
  defaultTimeZone: string;
  fiscalYearStart: number;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  esgFrameworks: string;
  taxId: string;
  hqAddress: string;
  totalGlobalM2: number;
  industrySector: IndustrySector;
  currency: CurrencyCode;
  reportingCurrency: ReportingCurrencyCode;
  minConfidence: number;
  baselineYear: number;
  reductionTarget: number;
  targetYear: number;
  subscriptionPlan: SubscriptionPlan;
  status: LifecycleStatus;
  createdAt: string | null;
  updatedAt: string | null;
};

export type OrganizationFormShape = {
  [K in keyof OrganizationFormValue]: FormControl<OrganizationFormValue[K]>;
};

export type OrganizationFormGroup = FormGroup<OrganizationFormShape>;

export type OrganizationFormFieldKind =
  | 'hidden'
  | 'text'
  | 'email'
  | 'url'
  | 'textarea'
  /** Entero sin decimales (años, etc.) */
  | 'integer'
  /** Decimal con opcional step */
  | 'number'
  | 'select';

export interface SelectOption<T extends string = string> {
  label: string;
  value: T;
}

function optionsOf<T extends string>(values: readonly T[]): SelectOption<T>[] {
  return values.map((v) => ({ label: v, value: v }));
}

/** Opciones enlazadas a schemas Zod exportados desde @sms/common. */
export const ORGANIZATION_FORM_ENUM_OPTIONS = Object.freeze({
  industrySector: optionsOf(IndustrySectorSchema.options as readonly IndustrySector[]),
  currency: optionsOf(CurrencyCodeSchema.options as readonly CurrencyCode[]),
  reportingCurrency: optionsOf(ReportingCurrencyCodeSchema.options as readonly ReportingCurrencyCode[]),
  subscriptionPlan: optionsOf(SubscriptionPlanSchema.options as readonly SubscriptionPlan[]),
  lifecycleStatus: optionsOf(LifecycleStatusSchema.options as readonly LifecycleStatus[]),
  unitSystem: [
    { label: 'METRIC', value: 'METRIC' as const },
    { label: 'IMPERIAL', value: 'IMPERIAL' as const }
  ] satisfies ReadonlyArray<SelectOption<'METRIC' | 'IMPERIAL'>>,
  primaryLanguage: [
    { label: 'English (en)', value: 'en' },
    { label: 'Español (es)', value: 'es' },
    { label: 'Hebrew (he)', value: 'he' },
    { label: 'Português (pt)', value: 'pt' },
    { label: 'Français (fr)', value: 'fr' }
  ] satisfies ReadonlyArray<SelectOption<string>>
});

export type OrganizationFormEnumOptionKey = keyof typeof ORGANIZATION_FORM_ENUM_OPTIONS;

export interface OrganizationFormFieldDef<K extends keyof OrganizationFormValue = keyof OrganizationFormValue> {
  readonly key: K;
  readonly label: string;
  readonly kind: OrganizationFormFieldKind;
  /** Columna en breakpoints md (`md:col-span-*`). Tailwind clase fija por valor. */
  readonly mdCols: 4 | 6 | 8 | 12;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly readonly?: boolean;
  readonly enumKey?: keyof typeof ORGANIZATION_FORM_ENUM_OPTIONS;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly patternRegex?: RegExp;
  readonly patternHint?: string;
  /** Texto del icono de ayuda al lado del label (opcional). */
  readonly help?: string;
}

export interface OrganizationFormTabDef {
  readonly id: string;
  readonly label: string;
  readonly headline?: string;
  readonly fields: ReadonlyArray<OrganizationFormFieldDef>;
}

/** Validadores alineados a reglas típicas de OrganizationDTOSchema (y UX). */
export function organizationFieldValidators(meta: OrganizationFormFieldDef): ValidatorFn[] {
  const v: ValidatorFn[] = [];
  if (meta.required) {
    if (meta.kind === 'textarea' || meta.kind === 'text' || meta.kind === 'email' || meta.kind === 'url') {
      v.push(Validators.required);
    } else if (meta.kind === 'integer' || meta.kind === 'number') {
      v.push(Validators.required);
    }
  }
  if (typeof meta.min === 'number') v.push(Validators.min(meta.min));
  if (typeof meta.max === 'number') v.push(Validators.max(meta.max));
  if (meta.kind === 'email') v.push(Validators.email);
  if (meta.patternRegex) v.push(Validators.pattern(meta.patternRegex));
  return v;
}

const ORGANIZATION_FORM_TABS_RAW: ReadonlyArray<OrganizationFormTabDef> = Object.freeze([
  {
    id: 'general',
    label: 'General',
    headline: 'Identidad y domicilio',
    fields: [
      { key: 'orgId', label: 'Organization ID', kind: 'hidden', mdCols: 12 },
      {
        key: 'name',
        label: 'Nombre comercial',
        kind: 'text',
        mdCols: 8,
        required: true
      },
      {
        key: 'legalName',
        label: 'Razón social',
        kind: 'text',
        mdCols: 8,
        required: true
      },
      {
        key: 'websiteUrl',
        label: 'Sitio web (opcional)',
        kind: 'url',
        mdCols: 6,
        placeholder: 'https://…'
      },
      {
        key: 'logoUrl',
        label: 'Logo URL (opcional)',
        kind: 'url',
        mdCols: 6,
        placeholder: 'https://…'
      },
      { key: 'taxId', label: 'Tax ID / CUIT', kind: 'text', mdCols: 6, required: true },
      { key: 'hqAddress', label: 'Sede principal', kind: 'text', mdCols: 12, required: true },
      {
        key: 'totalGlobalM2',
        label: 'Superficie global (m²)',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        step: 1
      }
    ]
  },
  {
    id: 'localization',
    label: 'Operación',
    headline: 'Localización, zona horaria y calendario fiscal',
    fields: [
      {
        key: 'primaryLanguage',
        label: 'Idioma principal (ISO 639-1)',
        kind: 'select',
        mdCols: 4,
        enumKey: 'primaryLanguage',
        required: true
      },
      {
        key: 'unitSystem',
        label: 'Sistema de unidades',
        kind: 'select',
        mdCols: 4,
        enumKey: 'unitSystem',
        required: true
      },
      {
        key: 'defaultTimeZone',
        label: 'Zona horaria por defecto',
        kind: 'text',
        mdCols: 4,
        placeholder: 'UTC / Asia/Jerusalem',
        required: true
      },
      {
        key: 'fiscalYearStart',
        label: 'Inicio año fiscal (mes 1–12)',
        kind: 'integer',
        mdCols: 4,
        required: true,
        min: 1,
        max: 12,
        step: 1
      }
    ]
  },
  {
    id: 'esg',
    label: 'ESG',
    headline: 'Marcos ESG y calidad de datos',
    fields: [
      {
        key: 'minConfidence',
        label: 'Confianza mínima OCR / datos (0–1)',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        max: 1,
        step: 0.01
      },
      {
        key: 'esgFrameworks',
        label: 'Marcos ESG (separados por coma)',
        kind: 'textarea',
        mdCols: 12,
        required: false,
        placeholder: 'GRI, SASB, TCFD'
      },
      {
        key: 'status',
        label: 'Estado del tenant',
        kind: 'select',
        mdCols: 6,
        enumKey: 'lifecycleStatus',
        required: true
      }
    ]
  },
  {
    id: 'financial',
    label: 'Financiero',
    headline: 'Parámetros económicos y sector',
    fields: [
      {
        key: 'industrySector',
        label: 'Sector industrial',
        kind: 'select',
        mdCols: 6,
        enumKey: 'industrySector',
        required: true
      },
      { key: 'currency', label: 'Moneda operativa', kind: 'select', mdCols: 4, enumKey: 'currency', required: true },
      {
        key: 'reportingCurrency',
        label: 'Moneda de reporting',
        kind: 'select',
        mdCols: 4,
        enumKey: 'reportingCurrency',
        required: true
      },
      {
        key: 'subscriptionPlan',
        label: 'Plan de suscripción',
        kind: 'select',
        mdCols: 4,
        enumKey: 'subscriptionPlan',
        required: true
      }
    ]
  },
  {
    id: 'carbon',
    label: 'Metas carbono',
    headline: 'Trayectorias de reducción (OrgConfig)',
    fields: [
      {
        key: 'baselineYear',
        label: 'Año baseline',
        kind: 'integer',
        mdCols: 4,
        required: true,
        min: 1900,
        max: 9999
      },
      {
        key: 'targetYear',
        label: 'Año objetivo',
        kind: 'integer',
        mdCols: 4,
        required: true,
        min: 1900,
        max: 9999
      },
      {
        key: 'reductionTarget',
        label: 'Meta de reducción (fracción o Δ según proceso interno)',
        kind: 'number',
        mdCols: 6,
        required: true,
        step: 0.01
      }
    ]
  },
  {
    id: 'contact',
    label: 'Contacto',
    headline: 'Administración y auditoría',
    fields: [
      { key: 'adminName', label: 'Nombre contacto', kind: 'text', mdCols: 6, required: true },
      { key: 'adminEmail', label: 'Email contacto', kind: 'email', mdCols: 6, required: true },
      {
        key: 'adminPhone',
        label: 'Teléfono (opcional)',
        kind: 'text',
        mdCols: 6,
        placeholder: '+972…'
      },
      {
        key: 'createdAt',
        label: 'createdAt (sólo lectura)',
        kind: 'text',
        mdCols: 6,
        readonly: true
      },
      {
        key: 'updatedAt',
        label: 'updatedAt (sólo lectura)',
        kind: 'text',
        mdCols: 6,
        readonly: true
      }
    ]
  },
  {
    id: 'costCenters',
    label: 'Centros de Costo',
    headline: 'Gestión presupuestaria transversal',
    fields: []
  }
]);

export const ORGANIZATION_COST_CENTERS_TAB_ID = 'costCenters' as const;

/**
 * Texto de ayuda contextual por campo del formulario Organization.
 * Se renderiza al hover sobre el icono `pi pi-question-circle` al lado del label.
 *
 * Convención: explicar el OBJETIVO de negocio del campo y, cuando aplica,
 * dejar pistas sobre cómo se usa downstream (ESG, contabilidad, multi-tenant).
 */
const ORGANIZATION_FIELD_HELP: Partial<Record<keyof OrganizationFormValue, string>> = {
  name:
    'Nombre comercial de la organización tal como aparece en marketing y dashboards. ' +
    'Es el identificador visual del tenant en toda la app.',
  legalName:
    'Razón social oficial registrada en el organismo fiscal. Se usa en facturas, ' +
    'certificados ESG y reportes regulatorios (no se muestra al usuario final).',
  websiteUrl:
    'URL del sitio web corporativo. Se usa en exports y branding de reportes ESG.',
  logoUrl:
    'URL pública del logo de la organización (PNG/SVG). Aparece en la barra superior ' +
    'y en las cabeceras de los reportes generados.',
  taxId:
    'Identificador fiscal del tenant (CUIT/NIF/EIN según el país). Crítico para ' +
    'cruzar facturas energéticas con la contabilidad.',
  hqAddress:
    'Domicilio legal de la sede principal. Se usa como ubicación por defecto cuando ' +
    'una sucursal no declara su propio domicilio.',
  totalGlobalM2:
    'Superficie total construida bajo control operacional, en metros cuadrados. ' +
    'Es el denominador de muchas intensidades ESG (kWh/m², kgCO₂/m²).',
  primaryLanguage:
    'Idioma por defecto de la UI y los reportes generados (códigos ISO 639-1).',
  unitSystem:
    'Sistema de unidades por defecto. METRIC = kWh, m², kg. IMPERIAL = kBTU, ft², lb. ' +
    'Afecta la presentación, no el almacenamiento (siempre se guarda en SI).',
  defaultTimeZone:
    'Zona horaria por defecto en formato IANA (ej. "Asia/Jerusalem", "America/New_York"). ' +
    'Crítica para tarifas con franjas horarias y agregaciones diarias.',
  fiscalYearStart:
    'Mes de inicio del año fiscal (1 = enero). Define el corte para presupuestos, ' +
    'metas anuales de reducción y reportes a inversores.',
  minConfidence:
    'Umbral mínimo de confianza (0–1) para aceptar lecturas OCR de facturas o datos ' +
    'extraídos automáticamente. Lecturas por debajo del umbral requieren revisión humana.',
  esgFrameworks:
    'Lista de marcos ESG bajo los que reporta la organización (GRI, SASB, TCFD, CSRD…). ' +
    'Habilita los exports y dashboards específicos de cada marco.',
  status:
    'Estado del tenant: ACTIVE (operativo) o INACTIVE (suspendido). ' +
    'Si está INACTIVE no se aceptan nuevos datos ni se ejecutan jobs programados.',
  industrySector:
    'Sector industrial principal (NAICS/ISIC). Define los benchmarks de comparación ' +
    'energética y los factores de emisión por defecto.',
  currency:
    'Moneda operativa del tenant (la moneda en que registra sus facturas).',
  reportingCurrency:
    'Moneda en la que se consolidan los reportes para inversores y management. ' +
    'Puede diferir de la operativa si la matriz reporta en USD/EUR.',
  subscriptionPlan:
    'Plan contratado en la plataforma. Define cuotas (organizaciones, sucursales, ' +
    'medidores) y módulos disponibles (Bedrock, Textract, alertas…).',
  baselineYear:
    'Año baseline contra el que se mide la reducción de emisiones (típicamente 2019 o 2020).',
  targetYear:
    'Año objetivo de la meta de reducción (ej. 2030 para SBTi de corto plazo, 2050 para net zero).',
  reductionTarget:
    'Meta de reducción absoluta o porcentual (según convención del proceso interno). ' +
    'Ej. 0.42 = -42% vs baseline; 100 = 100 t CO₂e absolutas.',
  adminName: 'Nombre del contacto administrativo responsable del tenant.',
  adminEmail:
    'Email del administrador. Recibe notificaciones críticas (cuotas, billing, ' +
    'alertas de seguridad) y cualquier requerimiento de auditoría.',
  adminPhone:
    'Teléfono del administrador (formato internacional con + y código de país). Opcional.',
  createdAt: 'Marca temporal RFC3339 de creación del tenant. Sólo lectura.',
  updatedAt: 'Marca temporal RFC3339 de la última modificación. Sólo lectura.'
};

/** Tabs del formulario con `help` ya inyectado desde `ORGANIZATION_FIELD_HELP`. */
export const ORGANIZATION_FORM_TABS: ReadonlyArray<OrganizationFormTabDef> = Object.freeze(
  withHelp(ORGANIZATION_FORM_TABS_RAW, ORGANIZATION_FIELD_HELP as Record<string, string>)
);

/** Clases Tailwind prefijadas para evitar purga dinámica. */
export const ORGANIZATION_FIELD_GRID_CLASS: Record<OrganizationFormFieldDef['mdCols'], string> = {
  4: 'col-span-12 md:col-span-4',
  6: 'col-span-12 md:col-span-6',
  8: 'col-span-12 md:col-span-8',
  12: 'col-span-12'
};

/** Valores iniciales al crear el FormGroup. */
export const ORGANIZATION_FORM_DEFAULT_VALUE: OrganizationFormValue = {
  orgId: '',
  name: '',
  legalName: '',
  websiteUrl: null,
  logoUrl: null,
  primaryLanguage: 'en',
  unitSystem: 'METRIC',
  defaultTimeZone: 'UTC',
  fiscalYearStart: 1,
  adminName: 'N/A',
  adminEmail: 'noreply@sms.invalid',
  adminPhone: '',
  esgFrameworks: '',
  taxId: '',
  hqAddress: '',
  totalGlobalM2: 0,
  industrySector: (IndustrySectorSchema.options[0] ?? 'MANUFACTURING') as IndustrySector,
  currency: (CurrencyCodeSchema.options[0] ?? 'ILS') as CurrencyCode,
  reportingCurrency: (ReportingCurrencyCodeSchema.options[0] ?? 'USD') as ReportingCurrencyCode,
  minConfidence: 0.85,
  baselineYear: new Date().getFullYear(),
  reductionTarget: 0,
  targetYear: new Date().getFullYear(),
  subscriptionPlan: (SubscriptionPlanSchema.options[0] ?? 'ENTERPRISE') as SubscriptionPlan,
  status: (LifecycleStatusSchema.options[0] ?? 'ACTIVE') as LifecycleStatus,
  createdAt: null,
  updatedAt: null
};

function allFieldDefs(): ReadonlyArray<OrganizationFormFieldDef> {
  return ORGANIZATION_FORM_TABS.flatMap((t) => t.fields);
}

export function buildOrganizationFormGroup(fb: FormBuilder): OrganizationFormGroup {
  const defaults = ORGANIZATION_FORM_DEFAULT_VALUE;
  const fbnn = fb.nonNullable;
  const controls = {} as Record<keyof OrganizationFormValue, FormControl | unknown>;
  for (const meta of allFieldDefs()) {
    const key = meta.key;
    const initial = defaults[key];
    const validators = organizationFieldValidators(meta);
    const isNullableScalar =
      key === 'websiteUrl' || key === 'logoUrl' || key === 'createdAt' || key === 'updatedAt';
    if (isNullableScalar && (initial === null || initial === undefined)) {
      controls[key] = fb.control<string | null>((initial ?? null) as string | null, validators);
      continue;
    }
    controls[key] = fbnn.control(initial as never, validators);
  }
  return fb.group(controls as never) as unknown as OrganizationFormGroup;
}

/**
 * Persistencia vía modelo común validado por Zod.
 */
export function organizationFormRawValueToDTO(v: OrganizationFormValue): OrganizationDTO {
  const input = {
    orgId: v.orgId,
    name: v.name,
    legalName: v.legalName,
    ...(v.websiteUrl?.trim() ? { websiteUrl: v.websiteUrl.trim() } : {}),
    ...(v.logoUrl?.trim() ? { logoUrl: v.logoUrl.trim() } : {}),
    primaryLanguage: v.primaryLanguage,
    unitSystem: v.unitSystem,
    defaultTimeZone: v.defaultTimeZone,
    fiscalYearStart: v.fiscalYearStart,
    adminContact: {
      name: v.adminName,
      email: v.adminEmail.trim(),
      ...(v.adminPhone?.trim() ? { phone: v.adminPhone.trim() } : {})
    },
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
  return parseOrganizationDTO(input);
}

export function hydrateOrganizationFormFromPartial(
  form: OrganizationFormGroup,
  patch: Partial<OrganizationDTO>,
  fallbackOrgId: string
): void {
  form.controls.orgId.patchValue(patch.orgId ?? fallbackOrgId, { emitEvent: false });
  if (typeof patch.name === 'string') form.controls.name.setValue(patch.name, { emitEvent: false });
  if (typeof patch.legalName === 'string') form.controls.legalName.setValue(patch.legalName, { emitEvent: false });
  if (typeof patch.websiteUrl === 'string') form.controls.websiteUrl.setValue(patch.websiteUrl, { emitEvent: false });
  if (typeof patch.logoUrl === 'string') form.controls.logoUrl.setValue(patch.logoUrl, { emitEvent: false });
  if (typeof patch.primaryLanguage === 'string')
    form.controls.primaryLanguage.setValue(patch.primaryLanguage, { emitEvent: false });
  if (patch.unitSystem === 'METRIC' || patch.unitSystem === 'IMPERIAL')
    form.controls.unitSystem.setValue(patch.unitSystem, { emitEvent: false });
  if (typeof (patch as OrganizationDTO & { defaultTimeZone?: string }).defaultTimeZone === 'string') {
    form.controls.defaultTimeZone.setValue(
      (patch as OrganizationDTO & { defaultTimeZone: string }).defaultTimeZone,
      { emitEvent: false }
    );
  }
  if (typeof patch.fiscalYearStart === 'number')
    form.controls.fiscalYearStart.setValue(patch.fiscalYearStart, { emitEvent: false });
  if (typeof patch.taxId === 'string') form.controls.taxId.setValue(patch.taxId, { emitEvent: false });
  if (typeof patch.hqAddress === 'string') form.controls.hqAddress.setValue(patch.hqAddress, { emitEvent: false });
  if (typeof patch.totalGlobalM2 === 'number')
    form.controls.totalGlobalM2.setValue(patch.totalGlobalM2, { emitEvent: false });
  if (typeof patch.industrySector === 'string')
    form.controls.industrySector.setValue(patch.industrySector as IndustrySector, { emitEvent: false });
  if (typeof patch.currency === 'string')
    form.controls.currency.setValue(patch.currency as CurrencyCode, { emitEvent: false });
  if (typeof patch.reportingCurrency === 'string')
    form.controls.reportingCurrency.setValue(patch.reportingCurrency as ReportingCurrencyCode, {
      emitEvent: false
    });
  if (typeof patch.minConfidence === 'number')
    form.controls.minConfidence.setValue(patch.minConfidence, { emitEvent: false });
  if (typeof patch.baselineYear === 'number')
    form.controls.baselineYear.setValue(patch.baselineYear, { emitEvent: false });
  if (typeof patch.reductionTarget === 'number')
    form.controls.reductionTarget.setValue(patch.reductionTarget, { emitEvent: false });
  if (typeof patch.targetYear === 'number')
    form.controls.targetYear.setValue(patch.targetYear, { emitEvent: false });
  if (typeof patch.subscriptionPlan === 'string')
    form.controls.subscriptionPlan.setValue(patch.subscriptionPlan as SubscriptionPlan, { emitEvent: false });
  if (patch.status === 'ACTIVE' || patch.status === 'INACTIVE')
    form.controls.status.setValue(patch.status, { emitEvent: false });

  const ac = patch.adminContact;
  if (ac && typeof ac.name === 'string') form.controls.adminName.setValue(ac.name, { emitEvent: false });
  if (ac && typeof ac.email === 'string') form.controls.adminEmail.setValue(ac.email, { emitEvent: false });
  if (ac && typeof ac.phone === 'string') form.controls.adminPhone.setValue(ac.phone, { emitEvent: false });

  if (Array.isArray(patch.esgFrameworks)) {
    form.controls.esgFrameworks.setValue(
      patch.esgFrameworks.filter((x): x is string => typeof x === 'string' && Boolean(x.trim())).join(', '),
      { emitEvent: false }
    );
  }

  if (typeof patch.createdAt === 'string') form.controls.createdAt.setValue(patch.createdAt, { emitEvent: false });
  if (typeof patch.updatedAt === 'string') form.controls.updatedAt.setValue(patch.updatedAt, { emitEvent: false });

  if (!form.controls.legalName.value?.trim() && form.controls.name.value?.trim()) {
    form.controls.legalName.setValue(form.controls.name.value, { emitEvent: false });
  }
}
