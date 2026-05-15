/**
 * Formulario declarativo de activo físico · alineado con @sms/common AssetDTOSchema / AssetDTO.
 */

import type { ValidatorFn } from '@angular/forms';
import { Validators } from '@angular/forms';
import type { FormBuilder, FormControl, FormGroup } from '@angular/forms';

import type { AssetDTO } from '@sms/common';
import { withHelp } from './form-help.util';
import { buildLocationFormGroup } from './location-form.component';
import {
  AssetLifecycleStatusSchema,
  AssetCriticalitySchema,
  AssetEnergySourceSchema,
  AssetEmissionSourceCategorySchema,
  AssetConditionIndexSchema,
  AssetRedundancyLevelSchema,
  AssetGhgScopeSchema,
  AssetTypeSchema,
  parseAssetDTO,
  type AssetConditionIndex,
  type AssetCriticality,
  type AssetEnergySource,
  type AssetEmissionSourceCategory,
  type AssetLifecycleStatus,
  type AssetGhgScope,
  type AssetRedundancyLevel,
  type AssetType
} from '@sms/common';

export type AssetFormValue = {
  id: string;
  organizationId: string;
  regionId: string;
  branchId: string;
  buildingId: string;
  costCenterId: string;
  name: string;
  assetTag: string | null;
  barcode: string | null;
  type: AssetType;
  status: AssetLifecycleStatus;
  criticality: AssetCriticality;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  installationDate: Date;
  usefulLifeYears: number;
  decommissionDate: Date | null;
  isSignificantEnergyUse: boolean;
  nominalPowerKw: number;
  standbyPowerKw: number | null;
  energySource: AssetEnergySource;
  nominalEfficiency: number;
  dutyCycleExpected: number;
  powerFactorTarget: number;
  ghgScope: AssetGhgScope;
  emissionSourceCategory: AssetEmissionSourceCategory;
  fuelType: string | null;
  biogenicFraction: number;
  refrigerantGasType: string | null;
  refrigerantChargeKg: number | null;
  refrigerantGWP: number | null;
  annualLeakageRateExpected: number;
  meterId: string | null;
  cloudDeviceId: string | null;
  telemetryTopic: string | null;
  isVirtualAsset: boolean;
  dataQualityScore: number;
  lastMaintenanceDate: Date | null;
  nextMaintenanceDate: Date | null;
  maintenanceVendor: string | null;
  conditionIndex: AssetConditionIndex;
  efficiencyDegradationFactor: number;
  redundancyLevel: AssetRedundancyLevel;
  mtbfHours: number | null;
  tagsJson: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AssetFormShape = { [K in keyof AssetFormValue]: FormControl<AssetFormValue[K]> };
export type AssetFormGroup = FormGroup<AssetFormShape>;

export type AssetFormFieldKind =
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

export const ASSET_FORM_ENUM_OPTIONS = Object.freeze({
  assetType: optionsOf(AssetTypeSchema.options as readonly AssetType[]),
  lifecycleStatus: optionsOf(AssetLifecycleStatusSchema.options as readonly AssetLifecycleStatus[]),
  criticality: optionsOf(AssetCriticalitySchema.options as readonly AssetCriticality[]),
  energySource: optionsOf(AssetEnergySourceSchema.options as readonly AssetEnergySource[]),
  ghgScope: optionsOf(AssetGhgScopeSchema.options as readonly AssetGhgScope[]),
  emissionSourceCategory: optionsOf(
    AssetEmissionSourceCategorySchema.options as readonly AssetEmissionSourceCategory[]
  ),
  conditionIndex: optionsOf(AssetConditionIndexSchema.options as readonly AssetConditionIndex[]),
  redundancyLevel: optionsOf(AssetRedundancyLevelSchema.options as readonly AssetRedundancyLevel[])
});

export interface AssetFormFieldDef<K extends keyof AssetFormValue = keyof AssetFormValue> {
  readonly key: K;
  readonly label: string;
  readonly kind: AssetFormFieldKind;
  readonly mdCols: 4 | 6 | 8 | 12;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly readonly?: boolean;
  readonly enumKey?: keyof typeof ASSET_FORM_ENUM_OPTIONS;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  /** Texto del icono de ayuda al lado del label (opcional). */
  readonly help?: string;
}

export interface AssetFormTabDef {
  readonly id: string;
  readonly label: string;
  readonly headline?: string;
  readonly fields: ReadonlyArray<AssetFormFieldDef>;
}

export function assetFieldValidators(meta: AssetFormFieldDef): ValidatorFn[] {
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
  return v;
}

const ASSET_FORM_TABS_RAW: ReadonlyArray<AssetFormTabDef> = Object.freeze([
  {
    id: 'general',
    label: 'General',
    headline: 'Identidad, tipo y clase de uso',
    fields: [
      { key: 'id', label: 'Asset ID', kind: 'hidden', mdCols: 12, required: true },
      { key: 'organizationId', label: 'Organization ID', kind: 'hidden', mdCols: 12, required: true },
      { key: 'regionId', label: 'Region ID', kind: 'hidden', mdCols: 12, required: true },
      { key: 'branchId', label: 'Branch ID', kind: 'hidden', mdCols: 12, required: true },
      { key: 'buildingId', label: 'Building ID', kind: 'hidden', mdCols: 12, required: true },
      { key: 'costCenterId', label: 'Cost Center ID', kind: 'hidden', mdCols: 12 },
      { key: 'name', label: 'Nombre del activo', kind: 'text', mdCols: 8, required: true },
      { key: 'assetTag', label: 'Etiqueta de activo', kind: 'text', mdCols: 4, placeholder: '(opcional)' },
      { key: 'barcode', label: 'Código barras', kind: 'text', mdCols: 4, placeholder: '(opcional)' },
      {
        key: 'type',
        label: 'Tipo técnico',
        kind: 'select',
        mdCols: 4,
        enumKey: 'assetType',
        required: true
      },
      {
        key: 'status',
        label: 'Estado ciclo de vida',
        kind: 'select',
        mdCols: 4,
        enumKey: 'lifecycleStatus',
        required: true
      },
      {
        key: 'criticality',
        label: 'Criticidad',
        kind: 'select',
        mdCols: 4,
        enumKey: 'criticality',
        required: true
      },
      {
        key: 'manufacturer',
        label: 'Fabricante',
        kind: 'text',
        mdCols: 6,
        placeholder: '(opcional)'
      },
      {
        key: 'model',
        label: 'Modelo',
        kind: 'text',
        mdCols: 6,
        placeholder: '(opcional)'
      },
      {
        key: 'serialNumber',
        label: 'Nº serie',
        kind: 'text',
        mdCols: 6,
        placeholder: '(opcional)'
      },
      {
        key: 'tagsJson',
        label: 'Etiquetas (JSON key/value)',
        kind: 'textarea',
        mdCols: 12,
        placeholder: '{ "zona":"A1", "sla":"HIGH" }'
      }
    ]
  },
  {
    id: 'lifecycle',
    label: 'Ciclo de vida',
    headline: 'Fechas instalación · vida útil · baja',
    fields: [
      {
        key: 'installationDate',
        label: 'Fecha instalación',
        kind: 'date',
        mdCols: 6,
        required: true
      },
      {
        key: 'usefulLifeYears',
        label: 'Vida útil (años)',
        kind: 'integer',
        mdCols: 6,
        required: true,
        min: 1,
        step: 1
      },
      {
        key: 'decommissionDate',
        label: 'Fecha baja prevista/real',
        kind: 'date',
        mdCols: 6
      },
      {
        key: 'isSignificantEnergyUse',
        label: 'Uso significativo de energía (SEU)',
        kind: 'checkbox',
        mdCols: 12,
        required: true
      }
    ]
  },
  {
    id: 'energy',
    label: 'Energía · rendimiento',
    headline: 'Potencia, ciclo de carga y vector energético',
    fields: [
      {
        key: 'nominalPowerKw',
        label: 'Potencia nominal (kW)',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        step: 0.01
      },
      {
        key: 'standbyPowerKw',
        label: 'Potencia standby (kW)',
        kind: 'number',
        mdCols: 6,
        min: 0,
        step: 0.01
      },
      {
        key: 'energySource',
        label: 'Vector energético principal',
        kind: 'select',
        mdCols: 6,
        enumKey: 'energySource',
        required: true
      },
      {
        key: 'nominalEfficiency',
        label: 'Eficiencia nominal',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        step: 0.01
      },
      {
        key: 'dutyCycleExpected',
        label: 'Ciclo útil esperado (0–1)',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        max: 1,
        step: 0.01
      },
      {
        key: 'powerFactorTarget',
        label: 'Objetivo factor de potencia (0–1)',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        max: 1,
        step: 0.01
      }
    ]
  },
  {
    id: 'ghg',
    label: 'GEI · fugitivos',
    headline: 'Alcance GEI y refrigerantes',
    fields: [
      {
        key: 'ghgScope',
        label: 'Alcance GHG Protocol',
        kind: 'select',
        mdCols: 6,
        enumKey: 'ghgScope',
        required: true
      },
      {
        key: 'emissionSourceCategory',
        label: 'Categoría fuente emisiones',
        kind: 'select',
        mdCols: 6,
        enumKey: 'emissionSourceCategory',
        required: true
      },
      {
        key: 'fuelType',
        label: 'Combustible declarado',
        kind: 'text',
        mdCols: 6,
        placeholder: '(opcional)'
      },
      {
        key: 'biogenicFraction',
        label: 'Fracción biogénica (0–1)',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        max: 1,
        step: 0.01
      },
      {
        key: 'refrigerantGasType',
        label: 'Gas refrigerante',
        kind: 'text',
        mdCols: 6,
        placeholder: '(opcional)'
      },
      {
        key: 'refrigerantChargeKg',
        label: 'Carga refrigerante (kg)',
        kind: 'number',
        mdCols: 6,
        min: 0,
        step: 0.01
      },
      {
        key: 'refrigerantGWP',
        label: 'GWP global (opcional)',
        kind: 'number',
        mdCols: 6,
        min: 0,
        step: 0.01
      },
      {
        key: 'annualLeakageRateExpected',
        label: 'Tasa fuga anual esperada (0–1)',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        max: 1,
        step: 0.01
      }
    ]
  },
  {
    id: 'iot',
    label: 'IoT · virtuales',
    headline: 'Identidad en nube y calidad datos',
    fields: [
      {
        key: 'meterId',
        label: 'Medidor enlazado (ID)',
        kind: 'text',
        mdCols: 6,
        placeholder: '(opcional)'
      },
      {
        key: 'cloudDeviceId',
        label: 'ID dispositivo nube',
        kind: 'text',
        mdCols: 6,
        placeholder: '(opcional)'
      },
      {
        key: 'telemetryTopic',
        label: 'Topic telemetría',
        kind: 'text',
        mdCols: 12,
        placeholder: '(opcional)'
      },
      { key: 'isVirtualAsset', label: 'Activo virtual / lógico', kind: 'checkbox', mdCols: 6, required: true },
      {
        key: 'dataQualityScore',
        label: 'Score calidad datos (0–1)',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        max: 1,
        step: 0.01
      }
    ]
  },
  {
    id: 'maintenance',
    label: 'Mantenimiento · resiliencia',
    headline: 'Planificación y confiabilidad',
    fields: [
      {
        key: 'lastMaintenanceDate',
        label: 'Último mantenimiento',
        kind: 'date',
        mdCols: 6
      },
      {
        key: 'nextMaintenanceDate',
        label: 'Próximo mantenimiento',
        kind: 'date',
        mdCols: 6
      },
      {
        key: 'maintenanceVendor',
        label: 'Proveedor mantenimiento',
        kind: 'text',
        mdCols: 12,
        placeholder: '(opcional)'
      },
      {
        key: 'conditionIndex',
        label: 'Índice de condición técnica',
        kind: 'select',
        mdCols: 6,
        enumKey: 'conditionIndex',
        required: true
      },
      {
        key: 'efficiencyDegradationFactor',
        label: 'Factor degradación eficiencia (0–1)',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        max: 1,
        step: 0.01
      },
      {
        key: 'redundancyLevel',
        label: 'Nivel redundancia',
        kind: 'select',
        mdCols: 6,
        enumKey: 'redundancyLevel',
        required: true
      },
      {
        key: 'mtbfHours',
        label: 'MTBF (horas)',
        kind: 'number',
        mdCols: 6,
        step: 1
      }
    ]
  },
  {
    id: 'audit',
    label: 'Auditoría',
    headline: 'Metadatos de sistema',
    fields: [
      { key: 'createdAt', label: 'createdAt (lectura)', kind: 'text', mdCols: 6, readonly: true },
      { key: 'updatedAt', label: 'updatedAt (lectura)', kind: 'text', mdCols: 6, readonly: true }
    ]
  }
]);

/**
 * Texto de ayuda contextual por campo del formulario Asset.
 * Foco: explicar el rol del dato en GHG, mantenimiento y telemetría.
 */
const ASSET_FIELD_HELP: Partial<Record<keyof AssetFormValue, string>> = {
  name:
    'Nombre legible del activo (ej. "Compresor Sala Máquinas A1"). Debe ser único ' +
    'dentro del edificio para que sea reconocible.',
  assetTag:
    'Tag interno físico (etiqueta CMMS). Se usa para conciliar con el sistema de ' +
    'mantenimiento (Maximo, Infor, etc.).',
  barcode:
    'Código de barras / QR físico para escaneo en mantenimientos preventivos. Opcional.',
  type:
    'Tipo de activo: HVAC_CHILLER, BOILER, COMPRESSOR, MOTOR, LIGHTING, etc. ' +
    'Determina los baselines y los modelos predictivos aplicables.',
  status:
    'Estado de ciclo de vida: OPERATIONAL, IDLE, FAULT, DECOMMISSIONED. Activos ' +
    'no-OPERATIONAL no consumen ni emiten en los reportes actuales.',
  criticality:
    'Criticidad operativa: LOW, MEDIUM, HIGH, CRITICAL. Define la prioridad de ' +
    'mantenimientos y el SLA de respuesta a fallos.',
  manufacturer: 'Fabricante (Daikin, Carrier, ABB, Siemens…). Útil para warranties y catálogos.',
  model: 'Modelo específico del fabricante. Permite asociar fichas técnicas y eficiencia nominal.',
  serialNumber: 'Número de serie del fabricante. Identificador único físico.',
  installationDate:
    'Fecha de instalación en sitio. Punto de partida para vida útil restante (RUL).',
  usefulLifeYears:
    'Vida útil esperada en años (catálogo o ISO 14224). Junto con installationDate ' +
    'calcula el deterioro esperado y la fecha óptima de reemplazo.',
  decommissionDate:
    'Fecha planificada o efectiva de baja del activo. Si está cargada, el activo ' +
    'no consolida en KPIs después de esa fecha.',
  isSignificantEnergyUse:
    'Marca el activo como Significant Energy Use (SEU) según ISO 50001 ' +
    '(usualmente top 80% del consumo energético).',
  nominalPowerKw:
    'Potencia nominal del activo en kW (placa de fábrica). Es la potencia máxima ' +
    'que puede demandar a régimen.',
  standbyPowerKw:
    'Consumo en standby/parado (kW). Material para detectar consumo fantasma y ' +
    'baselines nocturnos. Opcional.',
  energySource:
    'Fuente de energía principal: ELECTRICITY, NATURAL_GAS, DIESEL, STEAM, etc. ' +
    'Define el factor de emisión y el Scope.',
  nominalEfficiency:
    'Eficiencia nominal (0–1, ej. COP 0.85 = 85% de eficiencia). Catálogo del ' +
    'fabricante a régimen.',
  dutyCycleExpected:
    'Fracción 0–1 del tiempo en operación (duty cycle). 0.3 = 30% del año encendido. ' +
    'Pivote de la energía anual estimada.',
  powerFactorTarget:
    'Factor de potencia objetivo (0–1, típico 0.95). Por debajo del umbral, las ' +
    'distribuidoras suelen aplicar penalidades por reactiva.',
  ghgScope:
    'Scope GHG: SCOPE_1 (combustión directa), SCOPE_2 (electricidad comprada), ' +
    'SCOPE_3 (cadena). Define el método de cálculo de emisiones.',
  emissionSourceCategory:
    'Categoría de fuente de emisión (GRI/SASB). Afina la clasificación dentro del Scope.',
  fuelType: 'Tipo específico de combustible (DIESEL_B5, GAS_NATURAL, GLP, etc.). Opcional.',
  biogenicFraction:
    'Fracción 0–1 de carbono biogénico en el combustible (biodiesel, biomasa). ' +
    'Las emisiones biogénicas se reportan separadas según GHG Protocol.',
  refrigerantGasType:
    'Refrigerante usado (R410A, R32, R1234yf…). Crítico para Scope 1 fugitivas y ' +
    'compliance F-Gas.',
  refrigerantChargeKg:
    'Carga total de refrigerante en kg. Material para emisiones por fugas anuales.',
  refrigerantGWP:
    'GWP del refrigerante (Global Warming Potential, AR5). R410A=2088, R32=675. ' +
    'Si vacío, se infiere del tipo.',
  annualLeakageRateExpected:
    'Tasa anual esperada de fugas de refrigerante (0–1, típico 0.05–0.15 por equipo). ' +
    'Multiplica refrigerantChargeKg × GWP × tasa para emisiones Scope 1 fugitivas.',
  meterId:
    'ID del medidor que registra el consumo del activo (si está submedida). ' +
    'Si vacío, se prorratea desde un medidor padre.',
  cloudDeviceId:
    'ID del dispositivo en la plataforma IoT/cloud (AWS IoT, Azure IoT). ' +
    'Habilita la telemetría en vivo. Opcional.',
  telemetryTopic:
    'Tópico MQTT/Kafka donde el dispositivo publica telemetría. Necesario para ' +
    'streaming en tiempo real.',
  isVirtualAsset:
    'Marca el activo como virtual (no físico): suma/diferencia/agregación de otros ' +
    'activos. No se mantiene físicamente.',
  dataQualityScore:
    'Score 0–1 de calidad del dato (frecuencia, completitud, anomalías). Bajo el ' +
    'umbral, las predicciones se marcan como baja confianza.',
  lastMaintenanceDate: 'Fecha de la última intervención de mantenimiento. Opcional.',
  nextMaintenanceDate:
    'Fecha planificada del próximo mantenimiento. Genera alertas predictivas si vence.',
  maintenanceVendor: 'Empresa contratada para mantenimiento. Opcional.',
  conditionIndex:
    'Índice de condición actual: NEW, GOOD, DEGRADED, FAULT. Junto a usefulLifeYears ' +
    'alimenta la estimación de RUL.',
  efficiencyDegradationFactor:
    'Factor anual de degradación de eficiencia (0–1). Típico HVAC: 0.01–0.02 al año. ' +
    'Modelo de envejecimiento.',
  redundancyLevel:
    'Nivel de redundancia: NONE, N+1, 2N. Crítico para activos de misión crítica ' +
    '(data centers, hospitales).',
  mtbfHours:
    'Mean Time Between Failures (horas). Vida media entre fallos según ' +
    'fabricante o histórico. Opcional.',
  tagsJson:
    'Etiquetas clave→valor en JSON ({"line":"A","shift":"morning"}). Filtros y ' +
    'agrupaciones libres en dashboards.',
  createdAt: 'Marca temporal RFC3339 de creación. Sólo lectura.',
  updatedAt: 'Marca temporal RFC3339 de la última modificación. Sólo lectura.'
};

/** Tabs con `help` inyectado desde `ASSET_FIELD_HELP`. */
export const ASSET_FORM_TABS: ReadonlyArray<AssetFormTabDef> = Object.freeze(
  withHelp(ASSET_FORM_TABS_RAW, ASSET_FIELD_HELP as Record<string, string>)
);

export const ASSET_FIELD_GRID_CLASS: Record<AssetFormFieldDef['mdCols'], string> = {
  4: 'col-span-12 md:col-span-4',
  6: 'col-span-12 md:col-span-6',
  8: 'col-span-12 md:col-span-8',
  12: 'col-span-12'
};

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export const ASSET_FORM_DEFAULT_VALUE: AssetFormValue = {
  id: '',
  organizationId: '',
  regionId: '',
  branchId: '',
  buildingId: '',
  costCenterId: '',
  name: '',
  assetTag: null,
  barcode: null,
  type: (AssetTypeSchema.options[0] ?? 'HVAC') as AssetType,
  status: (AssetLifecycleStatusSchema.options[0] ?? 'ACTIVE') as AssetLifecycleStatus,
  criticality: (AssetCriticalitySchema.options[0] ?? 'MEDIUM') as AssetCriticality,
  manufacturer: null,
  model: null,
  serialNumber: null,
  installationDate: stripTime(new Date()),
  usefulLifeYears: 15,
  decommissionDate: null,
  isSignificantEnergyUse: false,
  nominalPowerKw: 0,
  standbyPowerKw: null,
  energySource: (AssetEnergySourceSchema.options[0] ?? 'ELECTRICITY') as AssetEnergySource,
  nominalEfficiency: 1,
  dutyCycleExpected: 0.8,
  powerFactorTarget: 0.95,
  ghgScope: (AssetGhgScopeSchema.options[0] ?? 'SCOPE_2') as AssetGhgScope,
  emissionSourceCategory: (AssetEmissionSourceCategorySchema.options[0] ??
    'PROCESS_EMISSIONS') as AssetEmissionSourceCategory,
  fuelType: null,
  biogenicFraction: 0,
  refrigerantGasType: null,
  refrigerantChargeKg: null,
  refrigerantGWP: null,
  annualLeakageRateExpected: 0.05,
  meterId: null,
  cloudDeviceId: null,
  telemetryTopic: null,
  isVirtualAsset: false,
  dataQualityScore: 1,
  lastMaintenanceDate: null,
  nextMaintenanceDate: null,
  maintenanceVendor: null,
  conditionIndex: (AssetConditionIndexSchema.options[0] ?? 'GOOD') as AssetConditionIndex,
  efficiencyDegradationFactor: 0.02,
  redundancyLevel: (AssetRedundancyLevelSchema.options[0] ?? 'N') as AssetRedundancyLevel,
  mtbfHours: null,
  tagsJson: '{}',
  createdAt: null,
  updatedAt: null
};

const NULLABLE_FIELDS = new Set<keyof AssetFormValue>([
  'assetTag',
  'barcode',
  'manufacturer',
  'model',
  'serialNumber',
  'decommissionDate',
  'standbyPowerKw',
  'fuelType',
  'refrigerantGasType',
  'refrigerantChargeKg',
  'refrigerantGWP',
  'meterId',
  'cloudDeviceId',
  'telemetryTopic',
  'lastMaintenanceDate',
  'nextMaintenanceDate',
  'maintenanceVendor',
  'mtbfHours',
  'createdAt',
  'updatedAt'
]);

function allFieldDefs(): ReadonlyArray<AssetFormFieldDef> {
  return ASSET_FORM_TABS.flatMap((t) => t.fields);
}

export function buildAssetFormGroup(fb: FormBuilder): AssetFormGroup {
  return buildLocationFormGroup({
    fb,
    fieldDefs: allFieldDefs(),
    defaults: ASSET_FORM_DEFAULT_VALUE as unknown as Record<string, unknown>,
    nullableFields: NULLABLE_FIELDS as unknown as ReadonlySet<string>,
    getValidators: assetFieldValidators
  }) as unknown as AssetFormGroup;
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

export function parseTagsJson(raw: string): Record<string, string> {
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

function optionalIso(v: Date | null): string | undefined {
  if (!(v instanceof Date)) return undefined;
  return toIsoLike(v);
}

export function assetFormRawValueToDTO(v: AssetFormValue): AssetDTO {
  if (!(v.installationDate instanceof Date)) {
    throw new Error('installationDate obligatoria');
  }
  const input: Record<string, unknown> = {
    id: v.id.trim(),
    organizationId: v.organizationId.trim(),
    regionId: v.regionId.trim(),
    branchId: v.branchId.trim(),
    buildingId: v.buildingId.trim(),
    costCenterId: v.costCenterId.trim(),
    name: v.name.trim(),
    type: v.type,
    status: v.status,
    criticality: v.criticality,
    installationDate: toIsoLike(v.installationDate),
    usefulLifeYears: v.usefulLifeYears,
    isSignificantEnergyUse: v.isSignificantEnergyUse,
    nominalPowerKw: v.nominalPowerKw,
    energySource: v.energySource,
    nominalEfficiency: v.nominalEfficiency,
    dutyCycleExpected: v.dutyCycleExpected,
    powerFactorTarget: v.powerFactorTarget,
    ghgScope: v.ghgScope,
    emissionSourceCategory: v.emissionSourceCategory,
    biogenicFraction: v.biogenicFraction,
    annualLeakageRateExpected: v.annualLeakageRateExpected,
    isVirtualAsset: v.isVirtualAsset,
    dataQualityScore: v.dataQualityScore,
    conditionIndex: v.conditionIndex,
    efficiencyDegradationFactor: v.efficiencyDegradationFactor,
    redundancyLevel: v.redundancyLevel,
    tags: parseTagsJson(v.tagsJson)
  };

  const at = v.assetTag?.trim();
  if (at) input['assetTag'] = at;
  const bc = v.barcode?.trim();
  if (bc) input['barcode'] = bc;
  const mf = v.manufacturer?.trim();
  if (mf) input['manufacturer'] = mf;
  const md = v.model?.trim();
  if (md) input['model'] = md;
  const sn = v.serialNumber?.trim();
  if (sn) input['serialNumber'] = sn;

  const dec = optionalIso(v.decommissionDate);
  if (dec) input['decommissionDate'] = dec;

  if (v.standbyPowerKw != null && !Number.isNaN(v.standbyPowerKw)) {
    input['standbyPowerKw'] = v.standbyPowerKw;
  }

  const ft = v.fuelType?.trim();
  if (ft) input['fuelType'] = ft;

  const rgt = v.refrigerantGasType?.trim();
  if (rgt) input['refrigerantGasType'] = rgt;
  if (v.refrigerantChargeKg != null && !Number.isNaN(v.refrigerantChargeKg)) {
    input['refrigerantChargeKg'] = v.refrigerantChargeKg;
  }
  if (v.refrigerantGWP != null && !Number.isNaN(v.refrigerantGWP)) {
    input['refrigerantGWP'] = v.refrigerantGWP;
  }

  const mid = v.meterId?.trim();
  if (mid) input['meterId'] = mid;
  const cid = v.cloudDeviceId?.trim();
  if (cid) input['cloudDeviceId'] = cid;
  const tt = v.telemetryTopic?.trim();
  if (tt) input['telemetryTopic'] = tt;

  const lmd = optionalIso(v.lastMaintenanceDate);
  if (lmd) input['lastMaintenanceDate'] = lmd;
  const nmd = optionalIso(v.nextMaintenanceDate);
  if (nmd) input['nextMaintenanceDate'] = nmd;
  const mv = v.maintenanceVendor?.trim();
  if (mv) input['maintenanceVendor'] = mv;

  if (v.mtbfHours != null && !Number.isNaN(v.mtbfHours) && v.mtbfHours >= 1) {
    input['mtbfHours'] = v.mtbfHours;
  }

  const ca = v.createdAt?.trim();
  if (ca) input['createdAt'] = ca;
  const ua = v.updatedAt?.trim();
  if (ua) input['updatedAt'] = ua;

  return parseAssetDTO(input);
}

export function hydrateAssetFormFromPartial(
  form: AssetFormGroup,
  patch: Partial<AssetDTO>,
  fallbackOrganizationId: string,
  fallbackRegionId: string,
  fallbackBranchId: string,
  fallbackBuildingId: string,
  fallbackAssetId: string
): void {
  form.controls.organizationId.patchValue(patch.organizationId ?? fallbackOrganizationId, {
    emitEvent: false
  });
  form.controls.regionId.patchValue(patch.regionId ?? fallbackRegionId, { emitEvent: false });
  form.controls.branchId.patchValue(patch.branchId ?? fallbackBranchId, { emitEvent: false });
  form.controls.buildingId.patchValue(patch.buildingId ?? fallbackBuildingId, { emitEvent: false });
  form.controls.id.patchValue(
    patch.id && typeof patch.id === 'string' ? patch.id : fallbackAssetId,
    { emitEvent: false }
  );

  if (typeof patch.costCenterId === 'string') {
    form.controls.costCenterId.setValue(patch.costCenterId, { emitEvent: false });
  }
  if (typeof patch.name === 'string') form.controls.name.setValue(patch.name, { emitEvent: false });

  const types = AssetTypeSchema.options as readonly string[];
  if (typeof patch.type === 'string' && types.includes(patch.type)) {
    form.controls.type.setValue(patch.type as AssetType, { emitEvent: false });
  }
  const sts = AssetLifecycleStatusSchema.options as readonly string[];
  if (typeof patch.status === 'string' && sts.includes(patch.status)) {
    form.controls.status.setValue(patch.status as AssetLifecycleStatus, { emitEvent: false });
  }
  const crit = AssetCriticalitySchema.options as readonly string[];
  if (typeof patch.criticality === 'string' && crit.includes(patch.criticality)) {
    form.controls.criticality.setValue(patch.criticality as AssetCriticality, { emitEvent: false });
  }

  if (typeof patch.assetTag === 'string') form.controls.assetTag.setValue(patch.assetTag, { emitEvent: false });
  else form.controls.assetTag.setValue(null, { emitEvent: false });
  if (typeof patch.barcode === 'string') form.controls.barcode.setValue(patch.barcode, { emitEvent: false });
  else form.controls.barcode.setValue(null, { emitEvent: false });
  if (typeof patch.manufacturer === 'string') {
    form.controls.manufacturer.setValue(patch.manufacturer, { emitEvent: false });
  } else form.controls.manufacturer.setValue(null, { emitEvent: false });
  if (typeof patch.model === 'string') form.controls.model.setValue(patch.model, { emitEvent: false });
  else form.controls.model.setValue(null, { emitEvent: false });
  if (typeof patch.serialNumber === 'string') {
    form.controls.serialNumber.setValue(patch.serialNumber, { emitEvent: false });
  } else form.controls.serialNumber.setValue(null, { emitEvent: false });

  if (typeof patch.installationDate === 'string') {
    const parsed = parseIsoToDate(patch.installationDate);
    form.controls.installationDate.setValue(
      parsed ?? stripTime(new Date()),
      { emitEvent: false }
    );
  } else if (patch.installationDate === undefined) {
    form.controls.installationDate.setValue(stripTime(new Date()), { emitEvent: false });
  }
  if (typeof patch.usefulLifeYears === 'number') {
    form.controls.usefulLifeYears.setValue(patch.usefulLifeYears, { emitEvent: false });
  }
  if (typeof patch.decommissionDate === 'string') {
    form.controls.decommissionDate.setValue(parseIsoToDate(patch.decommissionDate), { emitEvent: false });
  } else {
    form.controls.decommissionDate.setValue(null, { emitEvent: false });
  }

  if (typeof patch.isSignificantEnergyUse === 'boolean') {
    form.controls.isSignificantEnergyUse.setValue(patch.isSignificantEnergyUse, { emitEvent: false });
  }

  if (typeof patch.nominalPowerKw === 'number') {
    form.controls.nominalPowerKw.setValue(patch.nominalPowerKw, { emitEvent: false });
  } else {
    const legacyNp = (patch as Partial<AssetDTO> & { nominalPower?: number }).nominalPower;
    if (legacyNp !== undefined && typeof legacyNp === 'number') {
      form.controls.nominalPowerKw.setValue(legacyNp, { emitEvent: false });
    }
  }
  if (typeof patch.standbyPowerKw === 'number') {
    form.controls.standbyPowerKw.setValue(patch.standbyPowerKw, { emitEvent: false });
  } else form.controls.standbyPowerKw.setValue(null, { emitEvent: false });

  const es = AssetEnergySourceSchema.options as readonly string[];
  if (typeof patch.energySource === 'string' && es.includes(patch.energySource)) {
    form.controls.energySource.setValue(patch.energySource as AssetEnergySource, { emitEvent: false });
  }

  if (typeof patch.nominalEfficiency === 'number') {
    form.controls.nominalEfficiency.setValue(patch.nominalEfficiency, { emitEvent: false });
  }
  if (typeof patch.dutyCycleExpected === 'number') {
    form.controls.dutyCycleExpected.setValue(patch.dutyCycleExpected, { emitEvent: false });
  }
  if (typeof patch.powerFactorTarget === 'number') {
    form.controls.powerFactorTarget.setValue(patch.powerFactorTarget, { emitEvent: false });
  }

  const gs = AssetGhgScopeSchema.options as readonly string[];
  if (typeof patch.ghgScope === 'string' && gs.includes(patch.ghgScope)) {
    form.controls.ghgScope.setValue(patch.ghgScope as AssetGhgScope, { emitEvent: false });
  }

  const em = AssetEmissionSourceCategorySchema.options as readonly string[];
  if (typeof patch.emissionSourceCategory === 'string' && em.includes(patch.emissionSourceCategory)) {
    form.controls.emissionSourceCategory.setValue(
      patch.emissionSourceCategory as AssetEmissionSourceCategory,
      { emitEvent: false }
    );
  }

  if (typeof patch.fuelType === 'string') {
    form.controls.fuelType.setValue(patch.fuelType, { emitEvent: false });
  } else form.controls.fuelType.setValue(null, { emitEvent: false });

  if (typeof patch.biogenicFraction === 'number') {
    form.controls.biogenicFraction.setValue(patch.biogenicFraction, { emitEvent: false });
  }
  if (typeof patch.refrigerantGasType === 'string') {
    form.controls.refrigerantGasType.setValue(patch.refrigerantGasType, { emitEvent: false });
  } else form.controls.refrigerantGasType.setValue(null, { emitEvent: false });
  if (typeof patch.refrigerantChargeKg === 'number') {
    form.controls.refrigerantChargeKg.setValue(patch.refrigerantChargeKg, { emitEvent: false });
  } else form.controls.refrigerantChargeKg.setValue(null, { emitEvent: false });
  if (typeof patch.refrigerantGWP === 'number') {
    form.controls.refrigerantGWP.setValue(patch.refrigerantGWP, { emitEvent: false });
  } else form.controls.refrigerantGWP.setValue(null, { emitEvent: false });
  if (typeof patch.annualLeakageRateExpected === 'number') {
    form.controls.annualLeakageRateExpected.setValue(patch.annualLeakageRateExpected, { emitEvent: false });
  }

  if (typeof patch.meterId === 'string') {
    form.controls.meterId.setValue(patch.meterId, { emitEvent: false });
  } else form.controls.meterId.setValue(null, { emitEvent: false });

  if (typeof patch.cloudDeviceId === 'string') {
    form.controls.cloudDeviceId.setValue(patch.cloudDeviceId, { emitEvent: false });
  } else form.controls.cloudDeviceId.setValue(null, { emitEvent: false });

  if (typeof patch.telemetryTopic === 'string') {
    form.controls.telemetryTopic.setValue(patch.telemetryTopic, { emitEvent: false });
  } else form.controls.telemetryTopic.setValue(null, { emitEvent: false });

  if (typeof patch.isVirtualAsset === 'boolean') {
    form.controls.isVirtualAsset.setValue(patch.isVirtualAsset, { emitEvent: false });
  }
  if (typeof patch.dataQualityScore === 'number') {
    form.controls.dataQualityScore.setValue(patch.dataQualityScore, { emitEvent: false });
  }

  if (typeof patch.lastMaintenanceDate === 'string') {
    form.controls.lastMaintenanceDate.setValue(parseIsoToDate(patch.lastMaintenanceDate), {
      emitEvent: false
    });
  } else form.controls.lastMaintenanceDate.setValue(null, { emitEvent: false });

  if (typeof patch.nextMaintenanceDate === 'string') {
    form.controls.nextMaintenanceDate.setValue(parseIsoToDate(patch.nextMaintenanceDate), {
      emitEvent: false
    });
  } else form.controls.nextMaintenanceDate.setValue(null, { emitEvent: false });

  if (typeof patch.maintenanceVendor === 'string') {
    form.controls.maintenanceVendor.setValue(patch.maintenanceVendor, { emitEvent: false });
  } else form.controls.maintenanceVendor.setValue(null, { emitEvent: false });

  const ci = AssetConditionIndexSchema.options as readonly string[];
  if (typeof patch.conditionIndex === 'string' && ci.includes(patch.conditionIndex)) {
    form.controls.conditionIndex.setValue(patch.conditionIndex as AssetConditionIndex, { emitEvent: false });
  }

  if (typeof patch.efficiencyDegradationFactor === 'number') {
    form.controls.efficiencyDegradationFactor.setValue(patch.efficiencyDegradationFactor, {
      emitEvent: false
    });
  }

  const rl = AssetRedundancyLevelSchema.options as readonly string[];
  if (typeof patch.redundancyLevel === 'string' && rl.includes(patch.redundancyLevel)) {
    form.controls.redundancyLevel.setValue(patch.redundancyLevel as AssetRedundancyLevel, {
      emitEvent: false
    });
  }

  if (typeof patch.mtbfHours === 'number') {
    form.controls.mtbfHours.setValue(patch.mtbfHours, { emitEvent: false });
  } else form.controls.mtbfHours.setValue(null, { emitEvent: false });

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
