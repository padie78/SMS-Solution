/**
 * Formulario declarativo de tarifa · alineado con @sms/common TariffDTOSchema / TariffDTO.
 */

import type { ValidatorFn } from '@angular/forms';
import { Validators } from '@angular/forms';
import type { FormBuilder, FormControl, FormGroup } from '@angular/forms';

import type { TariffDTO, TariffDemandChargeUnit, TariffSeason, TariffTierRatePair } from '@sms/common';
import {
  EnergyServiceTypeSchema,
  TariffDemandChargeUnitSchema,
  TariffLifecycleStatusSchema,
  TariffPricingModelSchema,
  TariffSeasonSchema,
  TariffTierRatePairSchema,
  parseTariffDTO,
  type EnergyServiceType,
  type TariffLifecycleStatus,
  type TariffPricingModel
} from '@sms/common';
import { withHelp } from './form-help.util';
import { buildLocationFormGroup } from './location-form.component';

export type TariffFormValue = {
  id: string;
  orgId: string;
  branchId: string;
  buildingId: string | null;
  serviceType: EnergyServiceType;
  providerName: string;
  contractId: string;
  pricingModel: TariffPricingModel;
  currency: string;
  baseRate: number;
  expectedAverageRate: number | null;
  demandChargeRate: number | null;
  demandChargeUnit: TariffDemandChargeUnit;
  fixedMonthlyFee: number | null;
  taxPercentage: number;
  touScheduleId: string | null;
  peakRate: number | null;
  valleyRate: number | null;
  shoulderRate: number | null;
  season: TariffSeason;
  tieredRatesJson: string;
  fuelAdjustmentFactor: number;
  indexReferenceId: string | null;
  indexAdjustmentFormula: string | null;
  volatilityIndex: number;
  reactiveEnergyCharge: number | null;
  powerFactorThreshold: number;
  greenPremium: number;
  carbonTaxRate: number | null;
  efficiencyRebateRate: number | null;
  validFrom: Date;
  validTo: Date;
  billingCycleDay: number;
  status: TariffLifecycleStatus;
  tagsJson: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type TariffFormShape = { [K in keyof TariffFormValue]: FormControl<TariffFormValue[K]> };
export type TariffFormGroup = FormGroup<TariffFormShape>;

export type TariffFormFieldKind =
  | 'hidden'
  | 'text'
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

export const TARIFF_FORM_ENUM_OPTIONS = Object.freeze({
  energyServiceType: optionsOf(EnergyServiceTypeSchema.options as readonly EnergyServiceType[]),
  tariffPricingModel: optionsOf(TariffPricingModelSchema.options as readonly TariffPricingModel[]),
  tariffLifecycleStatus: optionsOf(TariffLifecycleStatusSchema.options as readonly TariffLifecycleStatus[]),
  tariffDemandChargeUnit: optionsOf(TariffDemandChargeUnitSchema.options as readonly TariffDemandChargeUnit[]),
  tariffSeason: optionsOf(TariffSeasonSchema.options as readonly TariffSeason[])
});

export interface TariffFormFieldDef<K extends keyof TariffFormValue = keyof TariffFormValue> {
  readonly key: K;
  readonly label: string;
  readonly kind: TariffFormFieldKind;
  readonly mdCols: 4 | 6 | 8 | 12;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly readonly?: boolean;
  readonly enumKey?: keyof typeof TARIFF_FORM_ENUM_OPTIONS;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  /** Texto del icono de ayuda al lado del label (opcional). */
  readonly help?: string;
}

export interface TariffFormTabDef {
  readonly id: string;
  readonly label: string;
  readonly headline?: string;
  readonly fields: ReadonlyArray<TariffFormFieldDef>;
}

export function tariffFieldValidators(meta: TariffFormFieldDef): ValidatorFn[] {
  const v: ValidatorFn[] = [];
  if (meta.kind === 'checkbox') return v;
  if (meta.required) {
    if (
      meta.kind === 'hidden' ||
      meta.kind === 'textarea' ||
      meta.kind === 'text' ||
      meta.kind === 'integer' ||
      meta.kind === 'number' ||
      meta.kind === 'select' ||
      meta.kind === 'date'
    ) {
      v.push(Validators.required);
    }
  }
  if (typeof meta.min === 'number') v.push(Validators.min(meta.min));
  if (typeof meta.max === 'number') v.push(Validators.max(meta.max));
  if (meta.key === 'currency') {
    v.push(Validators.maxLength(8));
  }
  return v;
}

const TARIFF_FORM_TABS_RAW: ReadonlyArray<TariffFormTabDef> = Object.freeze([
  {
    id: 'general',
    label: 'General',
    headline: 'Contrato, moneda, servicio y vigencia',
    fields: [
      { key: 'id', label: 'Tariff ID', kind: 'hidden', mdCols: 12 },
      { key: 'orgId', label: 'Organization ID', kind: 'hidden', mdCols: 12, required: true },
      { key: 'branchId', label: 'Branch ID', kind: 'hidden', mdCols: 12, required: true },
      {
        key: 'providerName',
        label: 'Proveedor / distribuidora',
        kind: 'text',
        mdCols: 6,
        required: true
      },
      { key: 'contractId', label: 'ID de contrato', kind: 'text', mdCols: 6, required: true },
      {
        key: 'buildingId',
        label: 'Building ID (opcional)',
        kind: 'text',
        mdCols: 6,
        placeholder: 'Ámbito edificio'
      },
      {
        key: 'serviceType',
        label: 'Tipo de servicio energético',
        kind: 'select',
        mdCols: 4,
        enumKey: 'energyServiceType',
        required: true
      },
      {
        key: 'pricingModel',
        label: 'Modelo de precio',
        kind: 'select',
        mdCols: 4,
        enumKey: 'tariffPricingModel',
        required: true
      },
      {
        key: 'currency',
        label: 'Moneda (ISO, máx. 8 caracteres)',
        kind: 'text',
        mdCols: 4,
        required: true,
        placeholder: 'ILS · USD …'
      },
      {
        key: 'status',
        label: 'Estado del contrato',
        kind: 'select',
        mdCols: 4,
        enumKey: 'tariffLifecycleStatus',
        required: true
      },
      {
        key: 'validFrom',
        label: 'Vigencia desde',
        kind: 'date',
        mdCols: 6,
        required: true
      },
      { key: 'validTo', label: 'Vigencia hasta', kind: 'date', mdCols: 6, required: true }
    ]
  },
  {
    id: 'financial',
    label: 'Parámetros financieros',
    headline: 'Cargos base, demanda y facturación',
    fields: [
      {
        key: 'baseRate',
        label: 'Tarifa base (energía)',
        kind: 'number',
        mdCols: 4,
        required: true,
        min: 0,
        step: 0.0001
      },
      {
        key: 'expectedAverageRate',
        label: 'Tarifa media esperada',
        kind: 'number',
        mdCols: 4,
        min: 0,
        step: 0.0001,
        placeholder: '(opcional)'
      },
      {
        key: 'fixedMonthlyFee',
        label: 'Cargo fijo mensual',
        kind: 'number',
        mdCols: 4,
        min: 0,
        step: 0.01,
        placeholder: '(opcional)'
      },
      {
        key: 'taxPercentage',
        label: 'Impuesto (0–1, ej. 0.17 = 17%)',
        kind: 'number',
        mdCols: 4,
        required: true,
        min: 0,
        max: 1,
        step: 0.001
      },
      {
        key: 'billingCycleDay',
        label: 'Día de ciclo de facturación (1–31)',
        kind: 'integer',
        mdCols: 4,
        required: true,
        min: 1,
        max: 31,
        step: 1
      },
      {
        key: 'demandChargeRate',
        label: 'Cargo por demanda',
        kind: 'number',
        mdCols: 4,
        min: 0,
        step: 0.0001,
        placeholder: '(opcional)'
      },
      {
        key: 'demandChargeUnit',
        label: 'Unidad demanda',
        kind: 'select',
        mdCols: 4,
        enumKey: 'tariffDemandChargeUnit',
        required: true
      },
      {
        key: 'reactiveEnergyCharge',
        label: 'Cargo energía reactiva',
        kind: 'number',
        mdCols: 4,
        min: 0,
        step: 0.0001,
        placeholder: '(opcional)'
      },
      {
        key: 'powerFactorThreshold',
        label: 'Umbral factor de potencia (0–1)',
        kind: 'number',
        mdCols: 4,
        required: true,
        min: 0,
        max: 1,
        step: 0.01
      }
    ]
  },
  {
    id: 'tou_index',
    label: 'TOU · índices',
    headline: 'Horarios, tramos, escalones e indexación',
    fields: [
      {
        key: 'touScheduleId',
        label: 'ID calendario TOU',
        kind: 'text',
        mdCols: 6,
        placeholder: '(opcional)'
      },
      {
        key: 'peakRate',
        label: 'Tarifa punta',
        kind: 'number',
        mdCols: 4,
        min: 0,
        step: 0.0001,
        placeholder: '(opcional)'
      },
      {
        key: 'valleyRate',
        label: 'Tarifa valle',
        kind: 'number',
        mdCols: 4,
        min: 0,
        step: 0.0001,
        placeholder: '(opcional)'
      },
      {
        key: 'shoulderRate',
        label: 'Tarifa intermedia',
        kind: 'number',
        mdCols: 4,
        min: 0,
        step: 0.0001,
        placeholder: '(opcional)'
      },
      {
        key: 'season',
        label: 'Temporada',
        kind: 'select',
        mdCols: 6,
        enumKey: 'tariffSeason',
        required: true
      },
      {
        key: 'tieredRatesJson',
        label: 'Escalones (JSON: [{ "limit", "rate" }, …])',
        kind: 'textarea',
        mdCols: 12,
        required: true,
        placeholder: '[]'
      },
      {
        key: 'fuelAdjustmentFactor',
        label: 'Factor ajuste combustible (> 0)',
        kind: 'number',
        mdCols: 4,
        required: true,
        min: 1e-6,
        step: 0.0001
      },
      {
        key: 'indexReferenceId',
        label: 'Referencia de índice',
        kind: 'text',
        mdCols: 6,
        placeholder: '(opcional)'
      },
      {
        key: 'indexAdjustmentFormula',
        label: 'Fórmula ajuste índice',
        kind: 'textarea',
        mdCols: 12,
        placeholder: '(opcional)'
      },
      {
        key: 'volatilityIndex',
        label: 'Índice de volatilidad (0–1)',
        kind: 'number',
        mdCols: 4,
        required: true,
        min: 0,
        max: 1,
        step: 0.01
      }
    ]
  },
  {
    id: 'carbon_esg',
    label: 'Carbono y eficiencia',
    headline: 'Primas verdes, carbono y bonificaciones',
    fields: [
      {
        key: 'greenPremium',
        label: 'Prima verde',
        kind: 'number',
        mdCols: 4,
        required: true,
        min: 0,
        step: 0.0001
      },
      {
        key: 'carbonTaxRate',
        label: 'Tasa impuesto carbono',
        kind: 'number',
        mdCols: 4,
        min: 0,
        step: 0.0001,
        placeholder: '(opcional)'
      },
      {
        key: 'efficiencyRebateRate',
        label: 'Tasa bonificación eficiencia',
        kind: 'number',
        mdCols: 4,
        min: 0,
        step: 0.0001,
        placeholder: '(opcional)'
      }
    ]
  },
  {
    id: 'metadata',
    label: 'Metadatos',
    headline: 'Etiquetas y auditoría',
    fields: [
      {
        key: 'tagsJson',
        label: 'tags (JSON objeto clave→valor)',
        kind: 'textarea',
        mdCols: 12,
        required: true,
        placeholder: '{}'
      },
      { key: 'createdAt', label: 'createdAt (lectura)', kind: 'text', mdCols: 6, readonly: true },
      { key: 'updatedAt', label: 'updatedAt (lectura)', kind: 'text', mdCols: 6, readonly: true }
    ]
  }
]);

/**
 * Texto de ayuda contextual por campo del formulario Tariff.
 * Foco: explicar cada componente de una factura de energía y su impacto en el costo total.
 */
const TARIFF_FIELD_HELP: Partial<Record<keyof TariffFormValue, string>> = {
  providerName:
    'Nombre del proveedor o distribuidora (ej. "EDF", "Iberdrola", "IEC"). ' +
    'Aparece en reportes y permite agrupar tarifas por proveedor.',
  contractId:
    'Identificador único del contrato con el proveedor (referencia legal). ' +
    'Permite cruzar con auditorías regulatorias.',
  buildingId:
    'Si la tarifa aplica sólo a un edificio específico, indicar su ID. Vacío = aplica ' +
    'a toda la sucursal.',
  serviceType:
    'Tipo de servicio energético: ELECTRICITY, NATURAL_GAS, STEAM, WATER, etc. ' +
    'Define la fórmula de cálculo.',
  pricingModel:
    'Modelo de precio: FIXED (tarifa plana), TOU (Time-Of-Use), TIERED (escalones), ' +
    'DEMAND, INDEXED. Determina qué campos son relevantes.',
  currency:
    'Moneda en que se factura (ISO, máx. 8 caracteres: ILS, USD, EUR…). ' +
    'Si difiere de la operativa se convierte en consolidación.',
  status:
    'Estado del contrato: ACTIVE (vigente), EXPIRED (vencido), PENDING (en aprobación), ' +
    'TERMINATED (rescindido). Sólo ACTIVE se aplica a lecturas nuevas.',
  validFrom:
    'Fecha desde la cual la tarifa es aplicable. Lecturas anteriores usan la tarifa previa.',
  validTo:
    'Fecha hasta la cual la tarifa es aplicable. Después se requiere una nueva tarifa o ' +
    'extensión del contrato.',
  baseRate:
    'Tarifa base por unidad de energía (moneda/kWh, moneda/m³…). Es el precio ' +
    'fundamental antes de cargos adicionales.',
  expectedAverageRate:
    'Tarifa promedio esperada teniendo en cuenta TOU, escalones, etc. Útil para ' +
    'forecasts presupuestarios. Opcional.',
  fixedMonthlyFee:
    'Cargo fijo mensual independiente del consumo (cargo por servicio). Opcional.',
  taxPercentage:
    'Impuestos aplicados como fracción 0–1 (ej. 0.17 = 17% IVA). Se aplica sobre el ' +
    'subtotal energético.',
  billingCycleDay:
    'Día del mes (1–31) en el que cierra el ciclo de facturación. Pivote para alinear ' +
    'lecturas de medidores con facturas.',
  demandChargeRate:
    'Cargo por demanda máxima registrada en el período. Muy relevante en grandes ' +
    'consumidores (industria). Opcional.',
  demandChargeUnit:
    'Unidad sobre la que se cobra demanda: KW, KVA, KW_PEAK_15MIN. Define la ventana ' +
    'de medición.',
  reactiveEnergyCharge:
    'Cargo por consumo de energía reactiva (kVArh). Penaliza factor de potencia bajo. ' +
    'Opcional.',
  powerFactorThreshold:
    'Umbral mínimo de factor de potencia (0–1, típico 0.95). Por debajo, se aplica ' +
    'penalidad reactiva.',
  touScheduleId:
    'ID del calendario TOU (Time-Of-Use) que define las franjas horarias punta/valle. ' +
    'Sólo aplica si pricingModel = TOU.',
  peakRate:
    'Tarifa aplicable en franja punta (la más cara, usualmente horario laboral pico). Opcional.',
  valleyRate:
    'Tarifa aplicable en franja valle (la más barata, usualmente noche). Opcional.',
  shoulderRate:
    'Tarifa aplicable en franja intermedia/hombro (entre punta y valle). Opcional.',
  season:
    'Temporada a la que aplica la tarifa: SUMMER, WINTER, ALL_YEAR, etc. ' +
    'Algunas tarifas distinguen verano/invierno.',
  tieredRatesJson:
    'Definición de escalones de consumo en JSON: [{"limit": 1000, "rate": 0.12}, ...]. ' +
    'Las primeras 1000 unidades cuestan 0.12, después el siguiente escalón.',
  fuelAdjustmentFactor:
    'Factor de ajuste por costo de combustible del generador (>0). Multiplica el rate ' +
    'base. Típico en mercados con pass-through de combustible.',
  indexReferenceId:
    'ID del índice de referencia para indexación (CPI, IPC, Brent, gas price). Sólo ' +
    'aplica si pricingModel = INDEXED.',
  indexAdjustmentFormula:
    'Fórmula libre que describe cómo el índice ajusta el rate (ej. "rate * (1 + ΔIPC)"). ' +
    'Documentación técnica.',
  volatilityIndex:
    'Índice 0–1 de volatilidad del precio. Útil para análisis de riesgo de exposición ' +
    'a mercados spot.',
  greenPremium:
    'Prima verde adicional pagada por origen renovable certificado. Permite separar el ' +
    'costo de la "verdura" del costo eléctrico base.',
  carbonTaxRate:
    'Tasa impositiva al carbono pasada al cliente (moneda/tCO₂e). Si la tarifa ya ' +
    'incluye carbon tax, cargarla aquí. Opcional.',
  efficiencyRebateRate:
    'Tasa de bonificación por eficiencia/medidas verdes acordadas con el utility. Opcional.',
  tagsJson:
    'Etiquetas libres clave→valor en JSON. Filtros y agrupaciones en dashboards.',
  createdAt: 'Marca temporal RFC3339 de creación. Sólo lectura.',
  updatedAt: 'Marca temporal RFC3339 de la última modificación. Sólo lectura.'
};

/** Tabs con `help` inyectado desde `TARIFF_FIELD_HELP`. */
export const TARIFF_FORM_TABS: ReadonlyArray<TariffFormTabDef> = Object.freeze(
  withHelp(TARIFF_FORM_TABS_RAW, TARIFF_FIELD_HELP as Record<string, string>)
);

export const TARIFF_FIELD_GRID_CLASS: Record<TariffFormFieldDef['mdCols'], string> = {
  4: 'col-span-12 md:col-span-4',
  6: 'col-span-12 md:col-span-6',
  8: 'col-span-12 md:col-span-8',
  12: 'col-span-12'
};

function allFieldDefs(): ReadonlyArray<TariffFormFieldDef> {
  return TARIFF_FORM_TABS.flatMap((t) => t.fields);
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 11, 31);
}

export const TARIFF_FORM_DEFAULT_VALUE: TariffFormValue = {
  id: '',
  orgId: '',
  branchId: '',
  buildingId: null,
  serviceType: (EnergyServiceTypeSchema.options[0] ?? 'ELECTRICITY') as EnergyServiceType,
  providerName: '',
  contractId: '',
  pricingModel: (TariffPricingModelSchema.options[0] ?? 'FIXED') as TariffPricingModel,
  currency: 'ILS',
  baseRate: 0,
  expectedAverageRate: null,
  demandChargeRate: null,
  demandChargeUnit: (TariffDemandChargeUnitSchema.options[0] ?? 'KW') as TariffDemandChargeUnit,
  fixedMonthlyFee: null,
  taxPercentage: 0.17,
  touScheduleId: null,
  peakRate: null,
  valleyRate: null,
  shoulderRate: null,
  season: (TariffSeasonSchema.options[0] ?? 'ALL_YEAR') as TariffSeason,
  tieredRatesJson: '[]',
  fuelAdjustmentFactor: 1,
  indexReferenceId: null,
  indexAdjustmentFormula: null,
  volatilityIndex: 0,
  reactiveEnergyCharge: null,
  powerFactorThreshold: 0.95,
  greenPremium: 0,
  carbonTaxRate: null,
  efficiencyRebateRate: null,
  validFrom: stripTime(new Date()),
  validTo: stripTime(endOfYear(new Date())),
  billingCycleDay: 1,
  status: (TariffLifecycleStatusSchema.options[0] ?? 'ACTIVE') as TariffLifecycleStatus,
  tagsJson: '{}',
  createdAt: null,
  updatedAt: null
};

const NULLABLE_FIELDS = new Set<keyof TariffFormValue>([
  'buildingId',
  'expectedAverageRate',
  'demandChargeRate',
  'fixedMonthlyFee',
  'touScheduleId',
  'peakRate',
  'valleyRate',
  'shoulderRate',
  'indexReferenceId',
  'indexAdjustmentFormula',
  'reactiveEnergyCharge',
  'carbonTaxRate',
  'efficiencyRebateRate',
  'createdAt',
  'updatedAt'
]);

export function buildTariffFormGroup(fb: FormBuilder): TariffFormGroup {
  return buildLocationFormGroup({
    fb,
    fieldDefs: allFieldDefs(),
    defaults: TARIFF_FORM_DEFAULT_VALUE as unknown as Record<string, unknown>,
    nullableFields: NULLABLE_FIELDS as unknown as ReadonlySet<string>,
    getValidators: tariffFieldValidators
  }) as unknown as TariffFormGroup;
}

function toIsoLike(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIsoToDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return null;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function parseTagsJsonTariff(raw: string): Record<string, string> {
  const s = raw.trim();
  if (!s) return {};
  try {
    const obj = JSON.parse(s) as unknown;
    if (typeof obj !== 'object' || obj === null) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const kk = k.trim();
      if (!kk) continue;
      out[kk] = String(v ?? '').trim();
    }
    return out;
  } catch {
    return {};
  }
}

function parseTieredRatesJson(raw: string): TariffTierRatePair[] | undefined {
  const s = raw.trim();
  if (!s || s === '[]') return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(s) as unknown;
  } catch {
    return undefined;
  }
  const r = TariffTierRatePairSchema.array().safeParse(parsed);
  return r.success ? r.data : undefined;
}

export function tariffFormRawValueToDTO(v: TariffFormValue): TariffDTO {
  if (!(v.validFrom instanceof Date) || !(v.validTo instanceof Date)) {
    throw new Error('Fechas de vigencia inválidas.');
  }

  const input: Record<string, unknown> = {
    ...(v.id.trim() ? { id: v.id.trim() } : {}),
    orgId: v.orgId.trim(),
    branchId: v.branchId.trim(),
    serviceType: v.serviceType,
    providerName: v.providerName.trim(),
    contractId: v.contractId.trim(),
    pricingModel: v.pricingModel,
    currency: v.currency.trim().toUpperCase().slice(0, 8),
    baseRate: v.baseRate,
    demandChargeUnit: v.demandChargeUnit,
    taxPercentage: v.taxPercentage,
    season: v.season,
    fuelAdjustmentFactor: v.fuelAdjustmentFactor,
    volatilityIndex: v.volatilityIndex,
    powerFactorThreshold: v.powerFactorThreshold,
    greenPremium: v.greenPremium,
    validFrom: toIsoLike(v.validFrom),
    validTo: toIsoLike(v.validTo),
    billingCycleDay: Math.trunc(v.billingCycleDay),
    status: v.status,
    tags: parseTagsJsonTariff(v.tagsJson)
  };

  const bid = v.buildingId?.trim();
  if (bid) input['buildingId'] = bid;

  const ex = v.expectedAverageRate;
  if (ex != null && Number.isFinite(ex)) input['expectedAverageRate'] = ex;

  const dcr = v.demandChargeRate;
  if (dcr != null && Number.isFinite(dcr)) input['demandChargeRate'] = dcr;

  const ff = v.fixedMonthlyFee;
  if (ff != null && Number.isFinite(ff)) input['fixedMonthlyFee'] = ff;

  const tou = v.touScheduleId?.trim();
  if (tou) input['touScheduleId'] = tou;

  const pk = v.peakRate;
  if (pk != null && Number.isFinite(pk)) input['peakRate'] = pk;
  const vl = v.valleyRate;
  if (vl != null && Number.isFinite(vl)) input['valleyRate'] = vl;
  const sh = v.shoulderRate;
  if (sh != null && Number.isFinite(sh)) input['shoulderRate'] = sh;

  const tiers = parseTieredRatesJson(v.tieredRatesJson);
  if (tiers !== undefined && tiers.length > 0) input['tieredRates'] = tiers;

  const idx = v.indexReferenceId?.trim();
  if (idx) input['indexReferenceId'] = idx;

  const fmla = v.indexAdjustmentFormula?.trim();
  if (fmla) input['indexAdjustmentFormula'] = fmla;

  const rec = v.reactiveEnergyCharge;
  if (rec != null && Number.isFinite(rec)) input['reactiveEnergyCharge'] = rec;

  const ct = v.carbonTaxRate;
  if (ct != null && Number.isFinite(ct)) input['carbonTaxRate'] = ct;

  const er = v.efficiencyRebateRate;
  if (er != null && Number.isFinite(er)) input['efficiencyRebateRate'] = er;

  const ca = v.createdAt?.trim();
  if (ca) input['createdAt'] = ca;
  const ua = v.updatedAt?.trim();
  if (ua) input['updatedAt'] = ua;

  return parseTariffDTO(input);
}

export function hydrateTariffFormFromPartial(
  form: TariffFormGroup,
  patch: Partial<TariffDTO>,
  fallbackOrgId: string,
  fallbackBranchId: string
): void {
  form.controls.orgId.setValue(patch.orgId ?? fallbackOrgId, { emitEvent: false });
  form.controls.branchId.setValue(patch.branchId ?? fallbackBranchId, { emitEvent: false });
  form.controls.id.setValue(typeof patch.id === 'string' ? patch.id : '', { emitEvent: false });

  if (typeof patch.providerName === 'string') {
    form.controls.providerName.setValue(patch.providerName, { emitEvent: false });
  }
  if (typeof patch.contractId === 'string') {
    form.controls.contractId.setValue(patch.contractId, { emitEvent: false });
  }

  if (typeof patch.buildingId === 'string') {
    form.controls.buildingId.setValue(patch.buildingId, { emitEvent: false });
  } else form.controls.buildingId.setValue(null, { emitEvent: false });

  const es = EnergyServiceTypeSchema.options as readonly string[];
  if (typeof patch.serviceType === 'string' && es.includes(patch.serviceType)) {
    form.controls.serviceType.setValue(patch.serviceType as EnergyServiceType, { emitEvent: false });
  }

  const pm = TariffPricingModelSchema.options as readonly string[];
  if (typeof patch.pricingModel === 'string' && pm.includes(patch.pricingModel)) {
    form.controls.pricingModel.setValue(patch.pricingModel as TariffPricingModel, { emitEvent: false });
  }

  if (typeof patch.currency === 'string') {
    form.controls.currency.setValue(patch.currency, { emitEvent: false });
  }

  if (typeof patch.baseRate === 'number' && Number.isFinite(patch.baseRate)) {
    form.controls.baseRate.setValue(patch.baseRate, { emitEvent: false });
  }

  if (typeof patch.expectedAverageRate === 'number' && Number.isFinite(patch.expectedAverageRate)) {
    form.controls.expectedAverageRate.setValue(patch.expectedAverageRate, { emitEvent: false });
  } else form.controls.expectedAverageRate.setValue(null, { emitEvent: false });

  if (typeof patch.demandChargeRate === 'number' && Number.isFinite(patch.demandChargeRate)) {
    form.controls.demandChargeRate.setValue(patch.demandChargeRate, { emitEvent: false });
  } else form.controls.demandChargeRate.setValue(null, { emitEvent: false });

  const du = TariffDemandChargeUnitSchema.options as readonly string[];
  if (typeof patch.demandChargeUnit === 'string' && du.includes(patch.demandChargeUnit)) {
    form.controls.demandChargeUnit.setValue(patch.demandChargeUnit as TariffDemandChargeUnit, {
      emitEvent: false
    });
  }

  if (typeof patch.fixedMonthlyFee === 'number' && Number.isFinite(patch.fixedMonthlyFee)) {
    form.controls.fixedMonthlyFee.setValue(patch.fixedMonthlyFee, { emitEvent: false });
  } else form.controls.fixedMonthlyFee.setValue(null, { emitEvent: false });

  if (typeof patch.taxPercentage === 'number' && Number.isFinite(patch.taxPercentage)) {
    form.controls.taxPercentage.setValue(patch.taxPercentage, { emitEvent: false });
  }

  if (typeof patch.touScheduleId === 'string') {
    form.controls.touScheduleId.setValue(patch.touScheduleId, { emitEvent: false });
  } else form.controls.touScheduleId.setValue(null, { emitEvent: false });

  if (typeof patch.peakRate === 'number' && Number.isFinite(patch.peakRate)) {
    form.controls.peakRate.setValue(patch.peakRate, { emitEvent: false });
  } else form.controls.peakRate.setValue(null, { emitEvent: false });

  if (typeof patch.valleyRate === 'number' && Number.isFinite(patch.valleyRate)) {
    form.controls.valleyRate.setValue(patch.valleyRate, { emitEvent: false });
  } else form.controls.valleyRate.setValue(null, { emitEvent: false });

  if (typeof patch.shoulderRate === 'number' && Number.isFinite(patch.shoulderRate)) {
    form.controls.shoulderRate.setValue(patch.shoulderRate, { emitEvent: false });
  } else form.controls.shoulderRate.setValue(null, { emitEvent: false });

  const sn = TariffSeasonSchema.options as readonly string[];
  if (typeof patch.season === 'string' && sn.includes(patch.season)) {
    form.controls.season.setValue(patch.season as TariffSeason, { emitEvent: false });
  }

  if (patch.tieredRates !== undefined && Array.isArray(patch.tieredRates) && patch.tieredRates.length > 0) {
    form.controls.tieredRatesJson.setValue(JSON.stringify(patch.tieredRates, null, 2), { emitEvent: false });
  }

  if (typeof patch.fuelAdjustmentFactor === 'number' && Number.isFinite(patch.fuelAdjustmentFactor)) {
    form.controls.fuelAdjustmentFactor.setValue(patch.fuelAdjustmentFactor, { emitEvent: false });
  }

  if (typeof patch.indexReferenceId === 'string') {
    form.controls.indexReferenceId.setValue(patch.indexReferenceId, { emitEvent: false });
  } else form.controls.indexReferenceId.setValue(null, { emitEvent: false });

  if (typeof patch.indexAdjustmentFormula === 'string') {
    form.controls.indexAdjustmentFormula.setValue(patch.indexAdjustmentFormula, { emitEvent: false });
  } else form.controls.indexAdjustmentFormula.setValue(null, { emitEvent: false });

  if (typeof patch.volatilityIndex === 'number' && Number.isFinite(patch.volatilityIndex)) {
    form.controls.volatilityIndex.setValue(patch.volatilityIndex, { emitEvent: false });
  }

  if (typeof patch.reactiveEnergyCharge === 'number' && Number.isFinite(patch.reactiveEnergyCharge)) {
    form.controls.reactiveEnergyCharge.setValue(patch.reactiveEnergyCharge, { emitEvent: false });
  } else form.controls.reactiveEnergyCharge.setValue(null, { emitEvent: false });

  if (typeof patch.powerFactorThreshold === 'number' && Number.isFinite(patch.powerFactorThreshold)) {
    form.controls.powerFactorThreshold.setValue(patch.powerFactorThreshold, { emitEvent: false });
  }

  if (typeof patch.greenPremium === 'number' && Number.isFinite(patch.greenPremium)) {
    form.controls.greenPremium.setValue(patch.greenPremium, { emitEvent: false });
  }

  if (typeof patch.carbonTaxRate === 'number' && Number.isFinite(patch.carbonTaxRate)) {
    form.controls.carbonTaxRate.setValue(patch.carbonTaxRate, { emitEvent: false });
  } else form.controls.carbonTaxRate.setValue(null, { emitEvent: false });

  if (typeof patch.efficiencyRebateRate === 'number' && Number.isFinite(patch.efficiencyRebateRate)) {
    form.controls.efficiencyRebateRate.setValue(patch.efficiencyRebateRate, { emitEvent: false });
  } else form.controls.efficiencyRebateRate.setValue(null, { emitEvent: false });

  if (typeof patch.validFrom === 'string') {
    const d = parseIsoToDate(patch.validFrom);
    if (d) form.controls.validFrom.setValue(stripTime(d), { emitEvent: false });
  }
  if (typeof patch.validTo === 'string') {
    const d = parseIsoToDate(patch.validTo);
    if (d) form.controls.validTo.setValue(stripTime(d), { emitEvent: false });
  }

  if (typeof patch.billingCycleDay === 'number' && Number.isFinite(patch.billingCycleDay)) {
    form.controls.billingCycleDay.setValue(Math.trunc(patch.billingCycleDay), { emitEvent: false });
  }

  const sts = TariffLifecycleStatusSchema.options as readonly string[];
  if (typeof patch.status === 'string' && sts.includes(patch.status)) {
    form.controls.status.setValue(patch.status as TariffLifecycleStatus, { emitEvent: false });
  }

  if (patch.tags && typeof patch.tags === 'object') {
    form.controls.tagsJson.setValue(JSON.stringify(patch.tags, null, 2), { emitEvent: false });
  }

  if (typeof patch.createdAt === 'string') {
    form.controls.createdAt.setValue(patch.createdAt, { emitEvent: false });
  }
  if (typeof patch.updatedAt === 'string') {
    form.controls.updatedAt.setValue(patch.updatedAt, { emitEvent: false });
  }
}
