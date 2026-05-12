/**
 * Formulario declarativo de sucursal alineado con @sms/common BranchDTOSchema / BranchDTO.
 */

import type { ValidatorFn } from '@angular/forms';
import { Validators } from '@angular/forms';
import type { FormBuilder, FormControl, FormGroup } from '@angular/forms';

import type { BranchDTO } from '@sms/common';
import { withHelp } from './form-help.util';
import { buildLocationFormGroup } from './location-form-shared';
import {
  BackupPowerTypeSchema,
  BranchStatusSchema,
  BranchTypeSchema,
  OwnershipTypeSchema,
  parseBranchDTO,
  type BackupPowerType,
  type BranchStatus,
  type BranchType,
  type OwnershipType
} from '@sms/common';

export type BranchFormValue = {
  id: string;
  organizationId: string;
  regionId: string;
  name: string;
  branchCode: string;
  timezone: string | null;
  status: BranchStatus;
  branchType: BranchType;
  isHeadquarters: boolean;
  constructionYear: number;
  renovationYear: number | null;
  tagsText: string;
  operatingWeekdaysOpen: string;
  operatingWeekdaysClose: string;
  operatingWeekendsOpen: string | null;
  operatingWeekendsClose: string | null;
  ownershipType: OwnershipType;
  leaseExpirationDate: Date | null;
  defaultTariffId: string | null;
  costCenterId: string | null;
  annualEnergyBudget: number | null;
  localCurrency: string;
  annualRevenueTarget: number | null;
  totalFloorAreaM2: number;
  employeeCount: number;
  fteEmployees: number;
  openingDaysPerYear: number;
  averageDailyVisitors: number | null;
  energyIntensityTarget: number;
  baseloadThreshold: number;
  peakPowerContracted: number;
  weatherStationId: string | null;
  backupPowerType: BackupPowerType;
  fuelTankCapacityLiters: number | null;
  criticalLoadKw: number | null;
  hasOnSiteRenewable: boolean;
  renewableCapacityKw: number | null;
  hasEvCharging: boolean;
  certificationsText: string;
  hasAirQualityMonitoring: boolean;
  coolingSetPoint: number;
  heatingSetPoint: number;
  branchManagerName: string;
  branchManagerEmail: string;
  branchManagerPhone: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type BranchFormShape = {
  [K in keyof BranchFormValue]: FormControl<BranchFormValue[K]>;
};

export type BranchFormGroup = FormGroup<BranchFormShape>;

export type BranchFormFieldKind =
  | 'hidden'
  | 'text'
  | 'email'
  | 'textarea'
  | 'integer'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'date';

export interface SelectOption<T extends string = string> {
  label: string;
  value: T;
}

function optionsOf<T extends string>(values: readonly T[]): SelectOption<T>[] {
  return values.map((v) => ({ label: v, value: v }));
}

export const BRANCH_FORM_ENUM_OPTIONS = Object.freeze({
  branchStatus: optionsOf(BranchStatusSchema.options as readonly BranchStatus[]),
  branchType: optionsOf(BranchTypeSchema.options as readonly BranchType[]),
  ownershipType: optionsOf(OwnershipTypeSchema.options as readonly OwnershipType[]),
  backupPowerType: optionsOf(BackupPowerTypeSchema.options as readonly BackupPowerType[])
});

export interface BranchFormFieldDef<K extends keyof BranchFormValue = keyof BranchFormValue> {
  readonly key: K;
  readonly label: string;
  readonly kind: BranchFormFieldKind;
  readonly mdCols: 4 | 6 | 8 | 12;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly readonly?: boolean;
  readonly enumKey?: keyof typeof BRANCH_FORM_ENUM_OPTIONS;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly patternRegex?: RegExp;
  readonly patternHint?: string;
  /** Texto del icono de ayuda al lado del label (opcional). */
  readonly help?: string;
}

export interface BranchFormTabDef {
  readonly id: string;
  readonly label: string;
  readonly headline?: string;
  readonly fields: ReadonlyArray<BranchFormFieldDef>;
}

const ISO_CURRENCY = /^[A-Za-z]{3}$/;

export function branchFieldValidators(meta: BranchFormFieldDef): ValidatorFn[] {
  const v: ValidatorFn[] = [];
  if (meta.kind === 'checkbox') {
    return v;
  }
  if (meta.required) {
    if (
      meta.kind === 'hidden' ||
      meta.kind === 'textarea' ||
      meta.kind === 'text' ||
      meta.kind === 'email' ||
      meta.kind === 'integer' ||
      meta.kind === 'number' ||
      meta.kind === 'select' ||
      meta.kind === 'date'
    ) {
      v.push(Validators.required);
    }
  }
  if (typeof meta.min === 'number') {
    v.push(Validators.min(meta.min));
  }
  if (typeof meta.max === 'number') {
    v.push(Validators.max(meta.max));
  }
  if (meta.kind === 'email') {
    v.push(Validators.email);
  }
  if (meta.patternRegex) {
    v.push(Validators.pattern(meta.patternRegex));
  }
  return v;
}

const BRANCH_FORM_TABS_RAW: ReadonlyArray<BranchFormTabDef> = Object.freeze([
  {
    id: 'general',
    label: 'General',
    headline: 'Identidad, tipo y metadatos',
    fields: [
      { key: 'id', label: 'Branch ID', kind: 'hidden', mdCols: 12, required: true },
      { key: 'organizationId', label: 'Organization ID', kind: 'hidden', mdCols: 12, required: true },
      { key: 'regionId', label: 'Region ID', kind: 'hidden', mdCols: 12, required: true },
      { key: 'name', label: 'Nombre sucursal', kind: 'text', mdCols: 8, required: true },
      { key: 'branchCode', label: 'Código sucursal', kind: 'text', mdCols: 4, required: true },
      {
        key: 'status',
        label: 'Estado operativo',
        kind: 'select',
        mdCols: 4,
        enumKey: 'branchStatus',
        required: true
      },
      {
        key: 'branchType',
        label: 'Tipo de instalación',
        kind: 'select',
        mdCols: 4,
        enumKey: 'branchType',
        required: true
      },
      {
        key: 'timezone',
        label: 'Zona horaria IANA (legacy)',
        kind: 'text',
        mdCols: 4,
        placeholder: 'Europe/Madrid'
      },
      { key: 'isHeadquarters', label: 'Sede corporativa', kind: 'checkbox', mdCols: 4, required: true },
      {
        key: 'constructionYear',
        label: 'Año construcción',
        kind: 'integer',
        mdCols: 4,
        required: true,
        min: 1000,
        max: 9999,
        step: 1
      },
      {
        key: 'renovationYear',
        label: 'Año renovación (opcional)',
        kind: 'integer',
        mdCols: 4,
        min: 1000,
        max: 9999,
        step: 1
      },
      {
        key: 'tagsText',
        label: 'Tags (separados por coma)',
        kind: 'textarea',
        mdCols: 12,
        placeholder: 'retail, flag…'
      }
    ]
  },
  {
    id: 'operations',
    label: 'Operación',
    headline: 'Superficie, dotación y horarios base',
    fields: [
      {
        key: 'totalFloorAreaM2',
        label: 'Superficie útil total (m²)',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        step: 1
      },
      {
        key: 'employeeCount',
        label: 'Nº empleados',
        kind: 'integer',
        mdCols: 6,
        required: true,
        min: 0,
        step: 1
      },
      {
        key: 'fteEmployees',
        label: 'Equivalente tiempo completo (FTE)',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        step: 0.01
      },
      {
        key: 'openingDaysPerYear',
        label: 'Días de apertura / año',
        kind: 'integer',
        mdCols: 6,
        required: true,
        min: 1,
        max: 366,
        step: 1
      },
      {
        key: 'averageDailyVisitors',
        label: 'Visitantes medios diarios (opcional)',
        kind: 'integer',
        mdCols: 6,
        min: 0,
        step: 1
      },
      {
        key: 'operatingWeekdaysOpen',
        label: 'Apertura entre semana',
        kind: 'text',
        mdCols: 6,
        required: true,
        placeholder: '09:00'
      },
      {
        key: 'operatingWeekdaysClose',
        label: 'Cierre entre semana',
        kind: 'text',
        mdCols: 6,
        required: true,
        placeholder: '18:00'
      },
      {
        key: 'operatingWeekendsOpen',
        label: 'Apertura fin de semana (opcional)',
        kind: 'text',
        mdCols: 6,
        placeholder: '10:00'
      },
      {
        key: 'operatingWeekendsClose',
        label: 'Cierre fin de semana (opcional)',
        kind: 'text',
        mdCols: 6,
        placeholder: '14:00'
      }
    ]
  },
  {
    id: 'energy_esg',
    label: 'ESG & energía',
    headline: 'Intensidad, climatización y activos verdes',
    fields: [
      {
        key: 'energyIntensityTarget',
        label: 'Objetivo intensidad energética',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        step: 0.01
      },
      {
        key: 'baseloadThreshold',
        label: 'Umbral baseload / mínimo técnico',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        step: 0.01
      },
      {
        key: 'peakPowerContracted',
        label: 'Potencia pico contratada',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        step: 0.01
      },
      {
        key: 'weatherStationId',
        label: 'ID estación meteorológica (opcional)',
        kind: 'text',
        mdCols: 6,
        placeholder: 'WS-…'
      },
      {
        key: 'coolingSetPoint',
        label: 'Consigna refrigeración (°C)',
        kind: 'number',
        mdCols: 6,
        required: true,
        step: 0.5
      },
      {
        key: 'heatingSetPoint',
        label: 'Consigna calefacción (°C)',
        kind: 'number',
        mdCols: 6,
        required: true,
        step: 0.5
      },
      {
        key: 'hasAirQualityMonitoring',
        label: 'Monitorización calidad del aire',
        kind: 'checkbox',
        mdCols: 6,
        required: true
      },
      {
        key: 'hasOnSiteRenewable',
        label: 'Generación renovable in-situ',
        kind: 'checkbox',
        mdCols: 6,
        required: true
      },
      {
        key: 'renewableCapacityKw',
        label: 'Capacidad renovable instalada (kW, opcional)',
        kind: 'number',
        mdCols: 6,
        min: 0,
        step: 0.1
      },
      {
        key: 'hasEvCharging',
        label: 'Puntos de recarga EV',
        kind: 'checkbox',
        mdCols: 6,
        required: true
      },
      {
        key: 'certificationsText',
        label: 'Certificaciones (lista, separada por comas)',
        kind: 'textarea',
        mdCols: 12,
        placeholder: 'LEED, ISO 50001…'
      }
    ]
  },
  {
    id: 'resilience',
    label: 'Resiliencia',
    headline: 'Backup y generación de emergencia',
    fields: [
      {
        key: 'backupPowerType',
        label: 'Tipo respaldo eléctrico',
        kind: 'select',
        mdCols: 6,
        enumKey: 'backupPowerType',
        required: true
      },
      {
        key: 'fuelTankCapacityLiters',
        label: 'Capacidad tanque combustible (L, opcional)',
        kind: 'number',
        mdCols: 6,
        min: 0,
        step: 1
      },
      {
        key: 'criticalLoadKw',
        label: 'Carga crítica respaldada (kW, opcional)',
        kind: 'number',
        mdCols: 6,
        min: 0,
        step: 0.1
      }
    ]
  },
  {
    id: 'financial',
    label: 'Financiero',
    headline: 'Propiedad, presupuestos y moneda local',
    fields: [
      {
        key: 'ownershipType',
        label: 'Modalidad de ocupación',
        kind: 'select',
        mdCols: 6,
        enumKey: 'ownershipType',
        required: true
      },
      {
        key: 'leaseExpirationDate',
        label: 'Vencimiento arrendamiento (opcional)',
        kind: 'date',
        mdCols: 6
      },
      {
        key: 'localCurrency',
        label: 'Moneda local (ISO 4217, 3 letras)',
        kind: 'text',
        mdCols: 4,
        required: true,
        placeholder: 'EUR',
        patternRegex: ISO_CURRENCY,
        patternHint: 'Tres letras, ej. EUR, USD, MXN.'
      },
      {
        key: 'annualEnergyBudget',
        label: 'Presupuesto energético anual (opcional)',
        kind: 'number',
        mdCols: 6,
        min: 0,
        step: 100
      },
      {
        key: 'annualRevenueTarget',
        label: 'Objetivo ingresos anuales (opcional)',
        kind: 'number',
        mdCols: 6,
        min: 0,
        step: 1000
      },
      {
        key: 'defaultTariffId',
        label: 'Tarifa por defecto — ID (opcional)',
        kind: 'text',
        mdCols: 6,
        placeholder: 'SMS id'
      },
      { key: 'costCenterId', label: 'Cost center ID (relación)', kind: 'hidden', mdCols: 12 }
    ]
  },
  {
    id: 'governance',
    label: 'Gobernanza',
    headline: 'Responsable de sucursal y auditoría',
    fields: [
      { key: 'branchManagerName', label: 'Nombre responsable', kind: 'text', mdCols: 6, required: true },
      { key: 'branchManagerEmail', label: 'Email responsable', kind: 'email', mdCols: 6, required: true },
      {
        key: 'branchManagerPhone',
        label: 'Teléfono (opcional, mín. 3 caracteres si se informa)',
        kind: 'text',
        mdCols: 6,
        patternRegex: /^$|^[\s\S]{3,}$/,
        patternHint: 'Vacío o al menos 3 caracteres.'
      },
      {
        key: 'createdAt',
        label: 'createdAt (lectura)',
        kind: 'text',
        mdCols: 6,
        readonly: true
      },
      {
        key: 'updatedAt',
        label: 'updatedAt (lectura)',
        kind: 'text',
        mdCols: 6,
        readonly: true
      }
    ]
  },
  {
    id: 'tariffs',
    label: 'Tarifas',
    headline: 'Contratos energéticos asociados',
    fields: []
  }
]);

/** Tab id usado para inyectar la grilla de tarifas (no usa fields del config). */
export const BRANCH_TARIFFS_TAB_ID = 'tariffs' as const;

/**
 * Texto de ayuda contextual por campo del formulario Branch.
 * Foco: explicar el rol operativo y energético del dato.
 */
const BRANCH_FIELD_HELP: Partial<Record<keyof BranchFormValue, string>> = {
  name:
    'Nombre legible de la sucursal (ej. "Planta Negev", "Tienda Madrid Centro"). ' +
    'Es la unidad mínima de control operativo y reporting.',
  branchCode:
    'Código corto único de la sucursal en el ERP/contabilidad. Se usa para ' +
    'cruzar facturas energéticas con la sucursal en el cierre contable.',
  timezone:
    'Zona horaria local (IANA). Si está vacía, hereda la de la región. ' +
    'Crítica para tarifas con franjas horarias.',
  status:
    'Estado operativo: OPERATIONAL, UNDER_CONSTRUCTION, CLOSED, etc. ' +
    'Sucursales no-OPERATIONAL no consolidan en KPIs de desempeño actual.',
  branchType:
    'Tipo de instalación: PLANT, OFFICE, RETAIL, WAREHOUSE, DATA_CENTER… ' +
    'Determina los benchmarks aplicables.',
  isHeadquarters:
    'Marca esta sucursal como sede central de la organización. Sólo puede haber una.',
  constructionYear:
    'Año de construcción original. Útil para inferir antigüedad de envolvente y HVAC.',
  renovationYear:
    'Último año de renovación mayor (envolvente, HVAC, eficiencia). Opcional.',
  tagsText:
    'Lista libre de etiquetas (separadas por comas) para filtrar y agrupar sucursales ' +
    '(ej. "frio_industrial, dark_store").',
  operatingWeekdaysOpen:
    'Hora de apertura entre semana en formato HH:MM 24h (ej. "08:00"). ' +
    'Define la franja "operación" para baseline vs no-operación.',
  operatingWeekdaysClose: 'Hora de cierre entre semana en formato HH:MM 24h (ej. "20:00").',
  operatingWeekendsOpen:
    'Hora de apertura en fin de semana (HH:MM). Vacío = no opera fines de semana.',
  operatingWeekendsClose: 'Hora de cierre en fin de semana (HH:MM). Vacío = no opera.',
  ownershipType:
    'Régimen de tenencia: OWNED, LEASED, MANAGED, FRANCHISED. Afecta el alcance ' +
    'del control operacional (relevante para Scope 1/2/3 boundaries).',
  leaseExpirationDate:
    'Fecha de expiración del contrato de arrendamiento. Pivote para decidir ROI ' +
    'de inversiones de eficiencia.',
  defaultTariffId:
    'ID de la tarifa de electricidad por defecto que aplica a esta sucursal. ' +
    'Se usa cuando un medidor no declara una tarifa propia.',
  costCenterId:
    'Centro de costo principal al que se imputa el gasto energético de la sucursal. ' +
    'Es complementario a la asignación multi-CC en metadata.costCenterIds.',
  annualEnergyBudget:
    'Presupuesto anual de energía (en moneda local). Se compara contra el gasto real ' +
    'para calcular budget burn y desvíos.',
  localCurrency:
    'Moneda en la que se contabiliza el gasto local (ej. ARS, ILS, EUR). ' +
    'Si difiere de la operativa, se convierte en runtime con tipo de cambio.',
  annualRevenueTarget:
    'Objetivo de revenue anual de la sucursal. Habilita intensidades por ingreso ' +
    '(kgCO₂/$). Opcional.',
  totalFloorAreaM2:
    'Superficie total construida bajo control operacional, en m². Denominador de ' +
    'intensidades energéticas (kWh/m²) y de carbono (kgCO₂/m²).',
  employeeCount:
    'Cantidad de empleados (incluye part-time). Se usa para denominadores sociales.',
  fteEmployees:
    'Equivalente a tiempo completo (Full-Time Equivalent). Más fiel que headcount ' +
    'para intensidades de tipo "kWh/empleado".',
  openingDaysPerYear:
    'Días operativos al año (ej. 250 oficina, 365 retail). Permite normalizar ' +
    'consumo por día de operación.',
  averageDailyVisitors:
    'Visitantes promedio por día. Útil en retail/educativo para intensidad por footfall.',
  energyIntensityTarget:
    'Meta de intensidad energética (kWh/m² u otra unidad acordada). Se usa para ' +
    'medir progreso vs baseline.',
  baseloadThreshold:
    'Umbral mínimo de potencia (kW) que define el baseload nocturno. Lecturas por debajo ' +
    'sugieren cierre correcto; por encima, "fantasma" o equipos olvidados.',
  peakPowerContracted:
    'Potencia máxima contratada con el utility (kW). Superarla suele tener penalidades ' +
    'fuertes; alimenta alertas de demand peak.',
  weatherStationId:
    'ID de la estación meteorológica más cercana (para normalización HDD/CDD). ' +
    'Opcional; si vacío, se usa la regional.',
  backupPowerType:
    'Tipo de respaldo eléctrico instalado: NONE, DIESEL_GENERATOR, BATTERY, UPS, etc. ' +
    'Afecta huella en eventos de apagón.',
  fuelTankCapacityLiters:
    'Capacidad del tanque de combustible del generador (litros). Necesario para ' +
    'calcular emisiones Scope 1 directas y autonomía.',
  criticalLoadKw:
    'Carga eléctrica crítica que debe mantenerse en un apagón (kW). Define el sizing ' +
    'mínimo del respaldo y de la batería.',
  hasOnSiteRenewable:
    'Marca la sucursal como tenedora de generación renovable propia (FV, eólica, etc.). ' +
    'Habilita el bloque de capacidad y net metering en medidores asociados.',
  renewableCapacityKw:
    'Capacidad instalada renovable propia (kWp). Se usa en Scope 2 método mercado y ' +
    'en proyecciones de autoconsumo.',
  hasEvCharging:
    'Hay puntos de carga de vehículos eléctricos en la sucursal. Cambia el patrón ' +
    'de demanda y puede requerir tarifa especial.',
  certificationsText:
    'Certificaciones edilicias (LEED, BREEAM, ISO 50001) separadas por comas. ' +
    'Habilita filtros y bonificaciones de tarifas verdes.',
  hasAirQualityMonitoring:
    'Hay sensores de calidad de aire interior (CO₂, COVs, PM2.5). Material para ' +
    'reportes de bienestar laboral y CSRD social.',
  coolingSetPoint:
    'Setpoint estándar de refrigeración (°C). Subirlo 1°C suele ahorrar 6-9% del ' +
    'consumo de A/C.',
  heatingSetPoint:
    'Setpoint estándar de calefacción (°C). Bajarlo 1°C suele ahorrar 7-10% del ' +
    'consumo de calefacción.',
  branchManagerName: 'Nombre del responsable operativo de la sucursal.',
  branchManagerEmail:
    'Email del responsable de la sucursal. Recibe alertas locales y reportes mensuales.',
  branchManagerPhone:
    'Teléfono del responsable (formato internacional). Opcional, mín. 3 chars si se carga.',
  createdAt: 'Marca temporal RFC3339 de creación. Sólo lectura.',
  updatedAt: 'Marca temporal RFC3339 de la última modificación. Sólo lectura.'
};

/** Tabs con `help` inyectado desde `BRANCH_FIELD_HELP`. */
export const BRANCH_FORM_TABS: ReadonlyArray<BranchFormTabDef> = Object.freeze(
  withHelp(BRANCH_FORM_TABS_RAW, BRANCH_FIELD_HELP as Record<string, string>)
);

export const BRANCH_FIELD_GRID_CLASS: Record<BranchFormFieldDef['mdCols'], string> = {
  4: 'col-span-12 md:col-span-4',
  6: 'col-span-12 md:col-span-6',
  8: 'col-span-12 md:col-span-8',
  12: 'col-span-12'
};

const yearNow = new Date().getFullYear();

export const BRANCH_FORM_DEFAULT_VALUE: BranchFormValue = {
  id: '',
  organizationId: '',
  regionId: '',
  name: '',
  branchCode: '',
  timezone: null,
  status: (BranchStatusSchema.options[0] ?? 'ACTIVE') as BranchStatus,
  branchType: (BranchTypeSchema.options[0] ?? 'OFFICE') as BranchType,
  isHeadquarters: false,
  constructionYear: yearNow,
  renovationYear: null,
  tagsText: '',
  operatingWeekdaysOpen: '09:00',
  operatingWeekdaysClose: '18:00',
  operatingWeekendsOpen: null,
  operatingWeekendsClose: null,
  ownershipType: (OwnershipTypeSchema.options[0] ?? 'OWNED') as OwnershipType,
  leaseExpirationDate: null,
  defaultTariffId: null,
  costCenterId: null,
  annualEnergyBudget: null,
  localCurrency: 'EUR',
  annualRevenueTarget: null,
  totalFloorAreaM2: 0,
  employeeCount: 0,
  fteEmployees: 0,
  openingDaysPerYear: 250,
  averageDailyVisitors: null,
  energyIntensityTarget: 0,
  baseloadThreshold: 0,
  peakPowerContracted: 0,
  weatherStationId: null,
  backupPowerType: (BackupPowerTypeSchema.options[0] ?? 'NONE') as BackupPowerType,
  fuelTankCapacityLiters: null,
  criticalLoadKw: null,
  hasOnSiteRenewable: false,
  renewableCapacityKw: null,
  hasEvCharging: false,
  certificationsText: '',
  hasAirQualityMonitoring: false,
  coolingSetPoint: 24,
  heatingSetPoint: 20,
  branchManagerName: 'N/A',
  branchManagerEmail: 'noreply@sms.invalid',
  branchManagerPhone: null,
  createdAt: null,
  updatedAt: null
};

const NULLABLE_FIELDS = new Set<keyof BranchFormValue>([
  'timezone',
  'renovationYear',
  'operatingWeekendsOpen',
  'operatingWeekendsClose',
  'leaseExpirationDate',
  'defaultTariffId',
  'costCenterId',
  'annualEnergyBudget',
  'annualRevenueTarget',
  'averageDailyVisitors',
  'weatherStationId',
  'fuelTankCapacityLiters',
  'criticalLoadKw',
  'renewableCapacityKw',
  'branchManagerPhone',
  'createdAt',
  'updatedAt'
]);

function allFieldDefs(): ReadonlyArray<BranchFormFieldDef> {
  return BRANCH_FORM_TABS.flatMap((t) => t.fields);
}

export function buildBranchFormGroup(fb: FormBuilder): BranchFormGroup {
  return buildLocationFormGroup({
    fb,
    fieldDefs: allFieldDefs(),
    defaults: BRANCH_FORM_DEFAULT_VALUE as unknown as Record<string, unknown>,
    nullableFields: NULLABLE_FIELDS as unknown as ReadonlySet<string>,
    getValidators: branchFieldValidators
  }) as unknown as BranchFormGroup;
}

function splitList(s: string): string[] {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function toIsoDateLocal(d: Date): string {
  const yy = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${yy}-${m}-${day}`;
}

function parseIsoDateToLocal(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return null;
  const yy = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(yy, mo, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function branchFormRawValueToDTO(v: BranchFormValue): BranchDTO {
  const weeksOpen = v.operatingWeekendsOpen?.trim() ?? '';
  const weeksClose = v.operatingWeekendsClose?.trim() ?? '';
  const operatingHours: {
    weekdays: { open: string; close: string };
    weekends?: { open: string; close: string };
  } = {
    weekdays: {
      open: v.operatingWeekdaysOpen.trim(),
      close: v.operatingWeekdaysClose.trim()
    }
  };
  if (weeksOpen && weeksClose) {
    operatingHours.weekends = { open: weeksOpen, close: weeksClose };
  }

  const phone = v.branchManagerPhone?.trim() ?? '';

  const input: Record<string, unknown> = {
    id: v.id.trim(),
    organizationId: v.organizationId.trim(),
    regionId: v.regionId.trim(),
    name: v.name.trim(),
    branchCode: v.branchCode.trim(),
    status: v.status,
    branchType: v.branchType,
    isHeadquarters: v.isHeadquarters,
    constructionYear: v.constructionYear,
    operatingHours,
    tags: splitList(v.tagsText),
    ownershipType: v.ownershipType,
    localCurrency: v.localCurrency.trim().toUpperCase(),
    totalFloorAreaM2: v.totalFloorAreaM2,
    employeeCount: v.employeeCount,
    fteEmployees: v.fteEmployees,
    openingDaysPerYear: v.openingDaysPerYear,
    energyIntensityTarget: v.energyIntensityTarget,
    baseloadThreshold: v.baseloadThreshold,
    peakPowerContracted: v.peakPowerContracted,
    hasOnSiteRenewable: v.hasOnSiteRenewable,
    hasEvCharging: v.hasEvCharging,
    certifications: splitList(v.certificationsText),
    hasAirQualityMonitoring: v.hasAirQualityMonitoring,
    coolingSetPoint: v.coolingSetPoint,
    heatingSetPoint: v.heatingSetPoint,
    branchManager: {
      name: v.branchManagerName.trim(),
      email: v.branchManagerEmail.trim(),
      ...(phone ? { phone } : {})
    },
    backupPowerType: v.backupPowerType
  };

  const tz = v.timezone?.trim();
  if (tz) input['timezone'] = tz;

  if (v.renovationYear != null && !Number.isNaN(v.renovationYear)) {
    input['renovationYear'] = v.renovationYear;
  }
  if (v.leaseExpirationDate instanceof Date) {
    input['leaseExpirationDate'] = toIsoDateLocal(v.leaseExpirationDate);
  }
  const tariffId = v.defaultTariffId?.trim();
  if (tariffId) input['defaultTariffId'] = tariffId;
  const cc = v.costCenterId?.trim();
  if (cc) input['costCenterId'] = cc;
  if (v.annualEnergyBudget != null && !Number.isNaN(v.annualEnergyBudget)) {
    input['annualEnergyBudget'] = v.annualEnergyBudget;
  }
  if (v.annualRevenueTarget != null && !Number.isNaN(v.annualRevenueTarget)) {
    input['annualRevenueTarget'] = v.annualRevenueTarget;
  }
  if (v.averageDailyVisitors != null && !Number.isNaN(v.averageDailyVisitors)) {
    input['averageDailyVisitors'] = v.averageDailyVisitors;
  }
  const ws = v.weatherStationId?.trim();
  if (ws) input['weatherStationId'] = ws;
  if (v.fuelTankCapacityLiters != null && !Number.isNaN(v.fuelTankCapacityLiters)) {
    input['fuelTankCapacityLiters'] = v.fuelTankCapacityLiters;
  }
  if (v.criticalLoadKw != null && !Number.isNaN(v.criticalLoadKw)) {
    input['criticalLoadKw'] = v.criticalLoadKw;
  }
  if (v.renewableCapacityKw != null && !Number.isNaN(v.renewableCapacityKw)) {
    input['renewableCapacityKw'] = v.renewableCapacityKw;
  }
  const ca = v.createdAt?.trim();
  if (ca) input['createdAt'] = ca;
  const ua = v.updatedAt?.trim();
  if (ua) input['updatedAt'] = ua;

  return parseBranchDTO(input);
}

export function hydrateBranchFormFromPartial(
  form: BranchFormGroup,
  patch: Partial<BranchDTO>,
  fallbackOrganizationId: string,
  fallbackRegionId: string,
  fallbackBranchId: string
): void {
  form.controls.organizationId.patchValue(patch.organizationId ?? fallbackOrganizationId, {
    emitEvent: false
  });
  form.controls.regionId.patchValue(patch.regionId ?? fallbackRegionId, { emitEvent: false });
  form.controls.id.patchValue(
    patch.id && typeof patch.id === 'string' ? patch.id : fallbackBranchId,
    { emitEvent: false }
  );

  if (typeof patch.name === 'string') form.controls.name.setValue(patch.name, { emitEvent: false });
  if (typeof patch.branchCode === 'string') {
    form.controls.branchCode.setValue(patch.branchCode, { emitEvent: false });
  }

  const branchStatuses = BranchStatusSchema.options as readonly string[];
  if (typeof patch.status === 'string' && branchStatuses.includes(patch.status)) {
    form.controls.status.setValue(patch.status as BranchStatus, { emitEvent: false });
  }

  const branchTypes = BranchTypeSchema.options as readonly string[];
  if (typeof patch.branchType === 'string' && branchTypes.includes(patch.branchType)) {
    form.controls.branchType.setValue(patch.branchType as BranchType, { emitEvent: false });
  }

  if (typeof patch.timezone === 'string') {
    form.controls.timezone.setValue(patch.timezone, { emitEvent: false });
  } else if (patch.timezone === undefined) {
    form.controls.timezone.setValue(null, { emitEvent: false });
  }

  if (typeof patch.isHeadquarters === 'boolean') {
    form.controls.isHeadquarters.setValue(patch.isHeadquarters, { emitEvent: false });
  }
  if (typeof patch.constructionYear === 'number') {
    form.controls.constructionYear.setValue(patch.constructionYear, { emitEvent: false });
  }
  if (typeof patch.renovationYear === 'number') {
    form.controls.renovationYear.setValue(patch.renovationYear, { emitEvent: false });
  } else if (patch.renovationYear === undefined) {
    form.controls.renovationYear.setValue(null, { emitEvent: false });
  }

  if (Array.isArray(patch.tags)) {
    form.controls.tagsText.setValue(
      patch.tags.filter((x): x is string => typeof x === 'string' && Boolean(x.trim())).join(', '),
      { emitEvent: false }
    );
  }

  const oh = patch.operatingHours;
  if (!oh?.weekdays) {
    form.controls.operatingWeekdaysOpen.setValue('09:00', { emitEvent: false });
    form.controls.operatingWeekdaysClose.setValue('18:00', { emitEvent: false });
  }
  if (oh?.weekdays) {
    if (typeof oh.weekdays.open === 'string') {
      form.controls.operatingWeekdaysOpen.setValue(oh.weekdays.open, { emitEvent: false });
    }
    if (typeof oh.weekdays.close === 'string') {
      form.controls.operatingWeekdaysClose.setValue(oh.weekdays.close, { emitEvent: false });
    }
  }
  if (oh?.weekends) {
    if (typeof oh.weekends.open === 'string') {
      form.controls.operatingWeekendsOpen.setValue(oh.weekends.open, { emitEvent: false });
    }
    if (typeof oh.weekends.close === 'string') {
      form.controls.operatingWeekendsClose.setValue(oh.weekends.close, { emitEvent: false });
    }
  } else {
    form.controls.operatingWeekendsOpen.setValue(null, { emitEvent: false });
    form.controls.operatingWeekendsClose.setValue(null, { emitEvent: false });
  }

  const owners = OwnershipTypeSchema.options as readonly string[];
  if (typeof patch.ownershipType === 'string' && owners.includes(patch.ownershipType)) {
    form.controls.ownershipType.setValue(patch.ownershipType as OwnershipType, { emitEvent: false });
  }

  if (typeof patch.leaseExpirationDate === 'string' && patch.leaseExpirationDate.trim()) {
    const parsed = parseIsoDateToLocal(patch.leaseExpirationDate);
    form.controls.leaseExpirationDate.setValue(parsed, { emitEvent: false });
  } else {
    form.controls.leaseExpirationDate.setValue(null, { emitEvent: false });
  }

  if (typeof patch.defaultTariffId === 'string') {
    form.controls.defaultTariffId.setValue(patch.defaultTariffId, { emitEvent: false });
  } else if (patch.defaultTariffId === undefined) {
    form.controls.defaultTariffId.setValue(null, { emitEvent: false });
  }
  if (typeof patch.costCenterId === 'string') {
    form.controls.costCenterId.setValue(patch.costCenterId, { emitEvent: false });
  } else if (patch.costCenterId === undefined) {
    form.controls.costCenterId.setValue(null, { emitEvent: false });
  }

  if (typeof patch.localCurrency === 'string') {
    form.controls.localCurrency.setValue(patch.localCurrency, { emitEvent: false });
  }
  if (typeof patch.annualEnergyBudget === 'number') {
    form.controls.annualEnergyBudget.setValue(patch.annualEnergyBudget, { emitEvent: false });
  }
  if (typeof patch.annualRevenueTarget === 'number') {
    form.controls.annualRevenueTarget.setValue(patch.annualRevenueTarget, { emitEvent: false });
  }

  if (typeof patch.totalFloorAreaM2 === 'number') {
    form.controls.totalFloorAreaM2.setValue(patch.totalFloorAreaM2, { emitEvent: false });
  }
  if (typeof patch.employeeCount === 'number') {
    form.controls.employeeCount.setValue(patch.employeeCount, { emitEvent: false });
  }
  if (typeof patch.fteEmployees === 'number') {
    form.controls.fteEmployees.setValue(patch.fteEmployees, { emitEvent: false });
  }
  if (typeof patch.openingDaysPerYear === 'number') {
    form.controls.openingDaysPerYear.setValue(patch.openingDaysPerYear, { emitEvent: false });
  }
  if (typeof patch.averageDailyVisitors === 'number') {
    form.controls.averageDailyVisitors.setValue(patch.averageDailyVisitors, { emitEvent: false });
  } else if (patch.averageDailyVisitors === undefined) {
    form.controls.averageDailyVisitors.setValue(null, { emitEvent: false });
  }

  if (typeof patch.energyIntensityTarget === 'number') {
    form.controls.energyIntensityTarget.setValue(patch.energyIntensityTarget, { emitEvent: false });
  }
  if (typeof patch.baseloadThreshold === 'number') {
    form.controls.baseloadThreshold.setValue(patch.baseloadThreshold, { emitEvent: false });
  }
  if (typeof patch.peakPowerContracted === 'number') {
    form.controls.peakPowerContracted.setValue(patch.peakPowerContracted, { emitEvent: false });
  }
  if (typeof patch.weatherStationId === 'string') {
    form.controls.weatherStationId.setValue(patch.weatherStationId, { emitEvent: false });
  } else if (patch.weatherStationId === undefined) {
    form.controls.weatherStationId.setValue(null, { emitEvent: false });
  }

  const backups = BackupPowerTypeSchema.options as readonly string[];
  if (typeof patch.backupPowerType === 'string' && backups.includes(patch.backupPowerType)) {
    form.controls.backupPowerType.setValue(patch.backupPowerType as BackupPowerType, { emitEvent: false });
  }

  if (typeof patch.fuelTankCapacityLiters === 'number') {
    form.controls.fuelTankCapacityLiters.setValue(patch.fuelTankCapacityLiters, { emitEvent: false });
  } else if (patch.fuelTankCapacityLiters === undefined) {
    form.controls.fuelTankCapacityLiters.setValue(null, { emitEvent: false });
  }
  if (typeof patch.criticalLoadKw === 'number') {
    form.controls.criticalLoadKw.setValue(patch.criticalLoadKw, { emitEvent: false });
  } else if (patch.criticalLoadKw === undefined) {
    form.controls.criticalLoadKw.setValue(null, { emitEvent: false });
  }

  if (typeof patch.hasOnSiteRenewable === 'boolean') {
    form.controls.hasOnSiteRenewable.setValue(patch.hasOnSiteRenewable, { emitEvent: false });
  }
  if (typeof patch.renewableCapacityKw === 'number') {
    form.controls.renewableCapacityKw.setValue(patch.renewableCapacityKw, { emitEvent: false });
  } else if (patch.renewableCapacityKw === undefined) {
    form.controls.renewableCapacityKw.setValue(null, { emitEvent: false });
  }
  if (typeof patch.hasEvCharging === 'boolean') {
    form.controls.hasEvCharging.setValue(patch.hasEvCharging, { emitEvent: false });
  }

  if (Array.isArray(patch.certifications)) {
    form.controls.certificationsText.setValue(
      patch.certifications.filter((x): x is string => typeof x === 'string' && Boolean(x.trim())).join(', '),
      { emitEvent: false }
    );
  }

  if (typeof patch.hasAirQualityMonitoring === 'boolean') {
    form.controls.hasAirQualityMonitoring.setValue(patch.hasAirQualityMonitoring, { emitEvent: false });
  }
  if (typeof patch.coolingSetPoint === 'number') {
    form.controls.coolingSetPoint.setValue(patch.coolingSetPoint, { emitEvent: false });
  }
  if (typeof patch.heatingSetPoint === 'number') {
    form.controls.heatingSetPoint.setValue(patch.heatingSetPoint, { emitEvent: false });
  }

  const bm = patch.branchManager;
  if (bm) {
    if (typeof bm.name === 'string') {
      form.controls.branchManagerName.setValue(bm.name, { emitEvent: false });
    }
    if (typeof bm.email === 'string') {
      form.controls.branchManagerEmail.setValue(bm.email, { emitEvent: false });
    }
    if (typeof bm.phone === 'string') {
      form.controls.branchManagerPhone.setValue(bm.phone, { emitEvent: false });
    } else {
      form.controls.branchManagerPhone.setValue(null, { emitEvent: false });
    }
  }

  if (typeof patch.createdAt === 'string') {
    form.controls.createdAt.setValue(patch.createdAt, { emitEvent: false });
  }
  if (typeof patch.updatedAt === 'string') {
    form.controls.updatedAt.setValue(patch.updatedAt, { emitEvent: false });
  }
}
