/**
 * Formulario declarativo de edificio alineado con @sms/common BuildingDTOSchema / BuildingDTO.
 */

import type { ValidatorFn } from '@angular/forms';
import { Validators } from '@angular/forms';
import type { FormBuilder, FormControl, FormGroup } from '@angular/forms';

import type { BuildingDTO } from '@sms/common';
import { withHelp } from './form-help.util';
import { buildLocationFormGroup } from './location-form-shared';
import {
  BuildingDataGranularitySchema,
  BuildingInsulationQualitySchema,
  BuildingLightingTechnologySchema,
  BuildingMaintenanceStatusSchema,
  BuildingRoofTypeSchema,
  BuildingSubmeteringTopologySchema,
  BuildingUsageTypeSchema,
  HvacTypeSchema,
  MainFuelTypeSchema,
  OperationalStatusSchema,
  parseBuildingDTO,
  type BuildingDataGranularity,
  type BuildingInsulationQuality,
  type BuildingLightingTechnology,
  type BuildingMaintenanceStatus,
  type BuildingRoofType,
  type BuildingSubmeteringTopology,
  type BuildingUsageType,
  type HvacType,
  type MainFuelType,
  type OperationalStatus
} from '@sms/common';

export type BuildingFormValue = {
  id: string;
  organizationId: string;
  regionId: string;
  branchId: string;
  name: string;
  status: OperationalStatus;
  usageTypeEnum: BuildingUsageType;
  usageType: string | null;
  m2Surface: number;
  m3Volume: number;
  footprintM2: number | null;
  floorsCount: number;
  yearBuilt: number;
  renovationYear: number | null;
  insulationQuality: BuildingInsulationQuality;
  windowWallRatio: number;
  roofType: BuildingRoofType;
  lat: number;
  lng: number;
  hvacType: HvacType;
  hvacAgeYears: number | null;
  hvacEfficiencyRating: number | null;
  maintenanceStatus: BuildingMaintenanceStatus;
  lastEnergyAuditDate: Date | null;
  mainFuelType: MainFuelType;
  lightingTechnology: BuildingLightingTechnology;
  lightingPowerDensity: number | null;
  hasBms: boolean;
  bmsVendor: string | null;
  bmsProtocolsText: string;
  hasSmartMetering: boolean;
  dataGranularity: BuildingDataGranularity;
  submeteringTopology: BuildingSubmeteringTopology;
  buildingCertificationsText: string;
  epcRating: string | null;
  onsiteGenerationCapacityKw: number | null;
  airQualitySensors: boolean;
  waterRecyclingSystem: boolean;
  evChargingPoints: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type BuildingFormShape = {
  [K in keyof BuildingFormValue]: FormControl<BuildingFormValue[K]>;
};

export type BuildingFormGroup = FormGroup<BuildingFormShape>;

export type BuildingFormFieldKind =
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

export const BUILDING_FORM_ENUM_OPTIONS = Object.freeze({
  operationalStatus: optionsOf(OperationalStatusSchema.options as readonly OperationalStatus[]),
  buildingUsage: optionsOf(BuildingUsageTypeSchema.options as readonly BuildingUsageType[]),
  insulationQuality: optionsOf(
    BuildingInsulationQualitySchema.options as readonly BuildingInsulationQuality[]
  ),
  roofType: optionsOf(BuildingRoofTypeSchema.options as readonly BuildingRoofType[]),
  maintenanceStatus: optionsOf(
    BuildingMaintenanceStatusSchema.options as readonly BuildingMaintenanceStatus[]
  ),
  hvacType: optionsOf(HvacTypeSchema.options as readonly HvacType[]),
  mainFuelType: optionsOf(MainFuelTypeSchema.options as readonly MainFuelType[]),
  lightingTechnology: optionsOf(
    BuildingLightingTechnologySchema.options as readonly BuildingLightingTechnology[]
  ),
  dataGranularity: optionsOf(
    BuildingDataGranularitySchema.options as readonly BuildingDataGranularity[]
  ),
  submeteringTopology: optionsOf(
    BuildingSubmeteringTopologySchema.options as readonly BuildingSubmeteringTopology[]
  )
});

export interface BuildingFormFieldDef<K extends keyof BuildingFormValue = keyof BuildingFormValue> {
  readonly key: K;
  readonly label: string;
  readonly kind: BuildingFormFieldKind;
  readonly mdCols: 4 | 6 | 8 | 12;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly readonly?: boolean;
  readonly enumKey?: keyof typeof BUILDING_FORM_ENUM_OPTIONS;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  /** Texto del icono de ayuda al lado del label (opcional). */
  readonly help?: string;
}

export interface BuildingFormTabDef {
  readonly id: string;
  readonly label: string;
  readonly headline?: string;
  readonly fields: ReadonlyArray<BuildingFormFieldDef>;
}

export function buildingFieldValidators(meta: BuildingFormFieldDef): ValidatorFn[] {
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

const BUILDING_FORM_TABS_RAW: ReadonlyArray<BuildingFormTabDef> = Object.freeze([
  {
    id: 'general',
    label: 'General',
    headline: 'Identidad, uso y dimensiones físicas',
    fields: [
      { key: 'id', label: 'Building ID', kind: 'hidden', mdCols: 12, required: true },
      { key: 'organizationId', label: 'Organization ID', kind: 'hidden', mdCols: 12, required: true },
      { key: 'regionId', label: 'Region ID', kind: 'hidden', mdCols: 12, required: true },
      { key: 'branchId', label: 'Branch ID', kind: 'hidden', mdCols: 12, required: true },
      { key: 'name', label: 'Nombre edificio', kind: 'text', mdCols: 8, required: true },
      {
        key: 'status',
        label: 'Estado operativo',
        kind: 'select',
        mdCols: 4,
        enumKey: 'operationalStatus',
        required: true
      },
      {
        key: 'usageTypeEnum',
        label: 'Uso predominante',
        kind: 'select',
        mdCols: 4,
        enumKey: 'buildingUsage',
        required: true
      },
      {
        key: 'usageType',
        label: 'Uso — texto legacy (opcional)',
        kind: 'text',
        mdCols: 8,
        placeholder: 'Descripción libre'
      },
      {
        key: 'm2Surface',
        label: 'Superficie (m²)',
        kind: 'number',
        mdCols: 4,
        required: true,
        min: 0,
        step: 1
      },
      {
        key: 'm3Volume',
        label: 'Volumen interior (m³)',
        kind: 'number',
        mdCols: 4,
        required: true,
        min: 0,
        step: 1
      },
      {
        key: 'footprintM2',
        label: 'Huella en planta (m², opcional)',
        kind: 'number',
        mdCols: 4,
        min: 0,
        step: 1
      },
      {
        key: 'floorsCount',
        label: 'Número de plantas',
        kind: 'integer',
        mdCols: 4,
        required: true,
        min: 1,
        step: 1
      },
      {
        key: 'yearBuilt',
        label: 'Año de construcción',
        kind: 'integer',
        mdCols: 4,
        required: true,
        min: 1800,
        max: 9999,
        step: 1
      },
      {
        key: 'renovationYear',
        label: 'Año renovación mayor (opcional)',
        kind: 'integer',
        mdCols: 4,
        min: 1800,
        max: 9999,
        step: 1
      }
    ]
  },
  {
    id: 'envelope',
    label: 'Geolocalización · envolvente',
    headline: 'Coordenadas y parámetros de envolvente',
    fields: [
      {
        key: 'lat',
        label: 'Latitud',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: -90,
        max: 90,
        step: 0.000001
      },
      {
        key: 'lng',
        label: 'Longitud',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: -180,
        max: 180,
        step: 0.000001
      },
      {
        key: 'insulationQuality',
        label: 'Calidad aislante',
        kind: 'select',
        mdCols: 6,
        enumKey: 'insulationQuality',
        required: true
      },
      {
        key: 'windowWallRatio',
        label: 'Ratio ventanas / cerramiento (0–1)',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        max: 1,
        step: 0.01
      },
      {
        key: 'roofType',
        label: 'Tipo de cubierta',
        kind: 'select',
        mdCols: 6,
        enumKey: 'roofType',
        required: true
      }
    ]
  },
  {
    id: 'hvac',
    label: 'HVAC · iluminación · BMS',
    headline: 'Sistemas térmicos e iluminación',
    fields: [
      {
        key: 'hvacType',
        label: 'Tipo HVAC',
        kind: 'select',
        mdCols: 6,
        enumKey: 'hvacType',
        required: true
      },
      {
        key: 'hvacAgeYears',
        label: 'Antigüedad HVAC (años, opcional)',
        kind: 'integer',
        mdCols: 6,
        min: 0,
        step: 1
      },
      {
        key: 'hvacEfficiencyRating',
        label: 'Indicador eficiencia HVAC (opcional)',
        kind: 'number',
        mdCols: 6,
        min: 0,
        step: 0.01
      },
      {
        key: 'maintenanceStatus',
        label: 'Estado de mantenimiento',
        kind: 'select',
        mdCols: 6,
        enumKey: 'maintenanceStatus',
        required: true
      },
      {
        key: 'lastEnergyAuditDate',
        label: 'Última auditoría energética (opcional)',
        kind: 'date',
        mdCols: 6
      },
      {
        key: 'mainFuelType',
        label: 'Combustible principal',
        kind: 'select',
        mdCols: 6,
        enumKey: 'mainFuelType',
        required: true
      },
      {
        key: 'lightingTechnology',
        label: 'Tecnología iluminación',
        kind: 'select',
        mdCols: 6,
        enumKey: 'lightingTechnology',
        required: true
      },
      {
        key: 'lightingPowerDensity',
        label: 'Densidad de potencia iluminación (opcional)',
        kind: 'number',
        mdCols: 6,
        min: 0,
        step: 0.01
      },
      { key: 'hasBms', label: 'BMS instalado', kind: 'checkbox', mdCols: 6, required: true },
      {
        key: 'bmsVendor',
        label: 'Proveedor BMS (opcional)',
        kind: 'text',
        mdCols: 6,
        placeholder: 'Vendor'
      },
      {
        key: 'bmsProtocolsText',
        label: 'Protocolos BMS (lista separada por comas)',
        kind: 'textarea',
        mdCols: 12,
        placeholder: 'BACNET, MODBUS…'
      }
    ]
  },
  {
    id: 'metering',
    label: 'Medición & datos',
    headline: 'Smart metering y granularidad',
    fields: [
      { key: 'hasSmartMetering', label: 'Medición inteligente', kind: 'checkbox', mdCols: 6, required: true },
      {
        key: 'dataGranularity',
        label: 'Granularidad de datos energía',
        kind: 'select',
        mdCols: 6,
        enumKey: 'dataGranularity',
        required: true
      },
      {
        key: 'submeteringTopology',
        label: 'Topología submedición',
        kind: 'select',
        mdCols: 6,
        enumKey: 'submeteringTopology',
        required: true
      }
    ]
  },
  {
    id: 'esg',
    label: 'ESG · certificación',
    headline: 'Certificación, generación distribuida y confort ambiental',
    fields: [
      {
        key: 'buildingCertificationsText',
        label: 'Certificaciones (lista, separada por comas)',
        kind: 'textarea',
        mdCols: 12,
        placeholder: 'LEED, BREEAM…'
      },
      {
        key: 'epcRating',
        label: 'Clasificación EPC / etiqueta energética (opcional)',
        kind: 'text',
        mdCols: 6,
        placeholder: 'A+, B…'
      },
      {
        key: 'onsiteGenerationCapacityKw',
        label: 'Potencia instalada generación onsite (kW, opcional)',
        kind: 'number',
        mdCols: 6,
        min: 0,
        step: 0.1
      },
      {
        key: 'airQualitySensors',
        label: 'Sensores calidad del aire',
        kind: 'checkbox',
        mdCols: 6,
        required: true
      },
      {
        key: 'waterRecyclingSystem',
        label: 'Sistema reciclaje agua',
        kind: 'checkbox',
        mdCols: 6,
        required: true
      },
      {
        key: 'evChargingPoints',
        label: 'Puntos de recarga EV',
        kind: 'integer',
        mdCols: 6,
        required: true,
        min: 0,
        step: 1
      }
    ]
  },
  {
    id: 'audit',
    label: 'Auditoría',
    headline: 'Metadatos de sistema',
    fields: [
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
  }
]);

/**
 * Texto de ayuda contextual por campo del formulario Building.
 * Foco: explicar el rol del dato en eficiencia energética y certificaciones.
 */
const BUILDING_FIELD_HELP: Partial<Record<keyof BuildingFormValue, string>> = {
  name:
    'Nombre legible del edificio (ej. "Torre Norte", "Nave 3"). Debe ser único ' +
    'dentro de la sucursal.',
  status:
    'Estado operativo: OPERATIONAL, UNDER_CONSTRUCTION, CLOSED, etc. ' +
    'Edificios no-OPERATIONAL no consolidan en KPIs de desempeño actual.',
  usageTypeEnum:
    'Categoría principal de uso (OFFICE, INDUSTRIAL, RETAIL, RESIDENTIAL…). ' +
    'Define los benchmarks y los estándares aplicables (ASHRAE 90.1, etc.).',
  usageType:
    'Sub-uso libre (ej. "data_center_tier_3", "cold_storage"). Opcional, complementa ' +
    'al enum estándar.',
  m2Surface:
    'Superficie útil construida del edificio (m²). Denominador clave de intensidades ' +
    'energéticas y de carbono.',
  m3Volume:
    'Volumen total interior del edificio (m³). Material para HVAC sizing y consumo ' +
    'esperado de calefacción/refrigeración.',
  footprintM2:
    'Superficie de huella en planta (footprint en m²). Útil para evaluar potencial ' +
    'de generación FV en cubierta. Opcional.',
  floorsCount:
    'Cantidad total de plantas/pisos (incluye sótanos). Afecta consumo de ascensores ' +
    'y bombeo de agua.',
  yearBuilt:
    'Año de construcción original. Determina la antigüedad de la envolvente y los ' +
    'estándares de eficiencia vigentes en el momento.',
  renovationYear: 'Último año de renovación mayor (envolvente, HVAC, eficiencia). Opcional.',
  insulationQuality:
    'Calidad de aislamiento térmico de la envolvente (POOR/MEDIUM/GOOD/EXCELLENT). ' +
    'Crítica para baselines de calefacción/refrigeración.',
  windowWallRatio:
    'Ratio Window-to-Wall (0–1, fracción de superficie vidriada en fachada). ' +
    'Alto = más ganancias solares y pérdidas térmicas.',
  roofType:
    'Tipo de cubierta: FLAT, PITCHED, GREEN, COOL, etc. Afecta potencial de FV en techo ' +
    'y pérdidas térmicas.',
  lat: 'Latitud del centroide del edificio (decimal). Permite ubicación precisa en mapas.',
  lng: 'Longitud del centroide del edificio (decimal).',
  hvacType:
    'Tipo de sistema HVAC principal: VRF, CHILLED_WATER, SPLIT, NONE… Determina ' +
    'eficiencia esperada y oportunidades de optimización.',
  hvacAgeYears:
    'Antigüedad en años del sistema HVAC. Equipos > 15 años suelen ser candidatos ' +
    'fuertes a reemplazo (ROI corto).',
  hvacEfficiencyRating:
    'COP/EER del HVAC. Valores típicos: HVAC eficiente ≥ 3.5; obsoleto < 2.5.',
  maintenanceStatus:
    'Estado de mantenimiento del HVAC y servicios: GOOD, FAIR, POOR. Afecta ' +
    'el factor de degradación aplicado a la eficiencia nominal.',
  lastEnergyAuditDate:
    'Fecha de la última auditoría energética (ISO 50001 o equivalente). ' +
    'ISO 50001 exige re-auditoría cada 4 años.',
  mainFuelType:
    'Combustible principal para calefacción/proceso: GAS, OIL, ELECTRICITY, DISTRICT… ' +
    'Determina el factor de emisión Scope 1 dominante.',
  lightingTechnology:
    'Tecnología principal de iluminación: LED, CFL, FLUORESCENT, HALOGEN. ' +
    'LED suele consumir 60-80% menos que halógeno.',
  lightingPowerDensity:
    'Densidad de potencia de iluminación (W/m²). Benchmark típico oficina LED: 8 W/m². Opcional.',
  hasBms: 'Hay un Building Management System instalado (BMS/BAS).',
  bmsVendor: 'Proveedor del BMS (Siemens, Honeywell, Schneider, JCI…). Opcional.',
  bmsProtocolsText:
    'Protocolos soportados por el BMS, separados por comas (BACnet, Modbus, KNX). ' +
    'Define la viabilidad de integraciones IoT.',
  hasSmartMetering: 'El edificio cuenta con medición inteligente (lecturas remotas en intervalos cortos).',
  dataGranularity:
    'Granularidad mínima de los datos disponibles: MONTHLY (factura), DAILY, HOURLY, ' +
    '15MIN. Determina qué análisis se pueden ejecutar.',
  submeteringTopology:
    'Topología de submedición: NONE, BY_FLOOR, BY_USE, BY_TENANT. Cuanto más granular, ' +
    'mejor atribución del consumo y ROI de acciones.',
  buildingCertificationsText:
    'Certificaciones edilicias (LEED Gold, BREEAM Excellent, ISO 50001…) separadas ' +
    'por comas.',
  epcRating:
    'Energy Performance Certificate (A-G). Obligatorio en EU para ciertos usos. Opcional.',
  onsiteGenerationCapacityKw:
    'Capacidad instalada de generación local renovable (FV, eólica) en kW. Opcional.',
  airQualitySensors:
    'Hay sensores de calidad de aire interior (CO₂, COVs, PM2.5). Material CSRD social ' +
    'y bienestar laboral.',
  waterRecyclingSystem:
    'Hay sistema de reciclaje/recuperación de aguas grises o pluviales. Reduce huella hídrica.',
  evChargingPoints:
    'Cantidad de puntos de carga de vehículos eléctricos en el edificio. Cambia el ' +
    'patrón de demanda y puede requerir tarifa específica.',
  createdAt: 'Marca temporal RFC3339 de creación. Sólo lectura.',
  updatedAt: 'Marca temporal RFC3339 de la última modificación. Sólo lectura.'
};

/** Tabs con `help` inyectado desde `BUILDING_FIELD_HELP`. */
export const BUILDING_FORM_TABS: ReadonlyArray<BuildingFormTabDef> = Object.freeze(
  withHelp(BUILDING_FORM_TABS_RAW, BUILDING_FIELD_HELP as Record<string, string>)
);

export const BUILDING_FIELD_GRID_CLASS: Record<BuildingFormFieldDef['mdCols'], string> = {
  4: 'col-span-12 md:col-span-4',
  6: 'col-span-12 md:col-span-6',
  8: 'col-span-12 md:col-span-8',
  12: 'col-span-12'
};

const yearBuiltDefault = Math.min(Math.max(new Date().getFullYear(), 1800), 9999);

export const BUILDING_FORM_DEFAULT_VALUE: BuildingFormValue = {
  id: '',
  organizationId: '',
  regionId: '',
  branchId: '',
  name: '',
  status: (OperationalStatusSchema.options[0] ?? 'OPERATIONAL') as OperationalStatus,
  usageTypeEnum: (BuildingUsageTypeSchema.options[0] ?? 'STORAGE_INDUSTRIAL') as BuildingUsageType,
  usageType: null,
  m2Surface: 0,
  m3Volume: 0,
  footprintM2: null,
  floorsCount: 1,
  yearBuilt: yearBuiltDefault,
  renovationYear: null,
  insulationQuality: (BuildingInsulationQualitySchema.options[0] ?? 'AVERAGE') as BuildingInsulationQuality,
  windowWallRatio: 0.35,
  roofType: (BuildingRoofTypeSchema.options[0] ?? 'STANDARD') as BuildingRoofType,
  lat: 0,
  lng: 0,
  hvacType: (HvacTypeSchema.options[0] ?? 'CENTRAL_CHILLER') as HvacType,
  hvacAgeYears: null,
  hvacEfficiencyRating: null,
  maintenanceStatus: (BuildingMaintenanceStatusSchema.options[0] ??
    'OPTIMAL') as BuildingMaintenanceStatus,
  lastEnergyAuditDate: null,
  mainFuelType: (MainFuelTypeSchema.options[0] ?? 'ELECTRICITY') as MainFuelType,
  lightingTechnology: (BuildingLightingTechnologySchema.options[0] ?? 'LED') as BuildingLightingTechnology,
  lightingPowerDensity: null,
  hasBms: false,
  bmsVendor: null,
  bmsProtocolsText: '',
  hasSmartMetering: false,
  dataGranularity: (BuildingDataGranularitySchema.options[0] ?? 'MONTHLY') as BuildingDataGranularity,
  submeteringTopology: (BuildingSubmeteringTopologySchema.options[0] ?? 'NONE') as BuildingSubmeteringTopology,
  buildingCertificationsText: '',
  epcRating: null,
  onsiteGenerationCapacityKw: null,
  airQualitySensors: false,
  waterRecyclingSystem: false,
  evChargingPoints: 0,
  createdAt: null,
  updatedAt: null
};

const NULLABLE_FIELDS = new Set<keyof BuildingFormValue>([
  'usageType',
  'footprintM2',
  'renovationYear',
  'hvacAgeYears',
  'hvacEfficiencyRating',
  'lastEnergyAuditDate',
  'lightingPowerDensity',
  'bmsVendor',
  'epcRating',
  'onsiteGenerationCapacityKw',
  'createdAt',
  'updatedAt'
]);

function allFieldDefs(): ReadonlyArray<BuildingFormFieldDef> {
  return BUILDING_FORM_TABS.flatMap((t) => t.fields);
}

export function buildBuildingFormGroup(fb: FormBuilder): BuildingFormGroup {
  return buildLocationFormGroup({
    fb,
    fieldDefs: allFieldDefs(),
    defaults: BUILDING_FORM_DEFAULT_VALUE as unknown as Record<string, unknown>,
    nullableFields: NULLABLE_FIELDS as unknown as ReadonlySet<string>,
    getValidators: buildingFieldValidators
  }) as unknown as BuildingFormGroup;
}

function splitList(s: string): string[] {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

export function buildingFormRawValueToDTO(v: BuildingFormValue): BuildingDTO {
  const input: Record<string, unknown> = {
    id: v.id.trim(),
    organizationId: v.organizationId.trim(),
    regionId: v.regionId.trim(),
    branchId: v.branchId.trim(),
    name: v.name.trim(),
    status: v.status,
    usageTypeEnum: v.usageTypeEnum,
    m2Surface: v.m2Surface,
    m3Volume: v.m3Volume,
    floorsCount: v.floorsCount,
    yearBuilt: v.yearBuilt,
    insulationQuality: v.insulationQuality,
    windowWallRatio: v.windowWallRatio,
    roofType: v.roofType,
    coordinates: { lat: v.lat, lng: v.lng },
    hvacType: v.hvacType,
    maintenanceStatus: v.maintenanceStatus,
    mainFuelType: v.mainFuelType,
    lightingTechnology: v.lightingTechnology,
    hasBms: v.hasBms,
    bmsProtocols: splitList(v.bmsProtocolsText),
    hasSmartMetering: v.hasSmartMetering,
    dataGranularity: v.dataGranularity,
    submeteringTopology: v.submeteringTopology,
    buildingCertifications: splitList(v.buildingCertificationsText),
    airQualitySensors: v.airQualitySensors,
    waterRecyclingSystem: v.waterRecyclingSystem,
    evChargingPoints: v.evChargingPoints
  };

  const ut = v.usageType?.trim();
  if (ut) input['usageType'] = ut;
  if (v.footprintM2 != null && !Number.isNaN(v.footprintM2)) {
    input['footprintM2'] = v.footprintM2;
  }
  if (v.renovationYear != null && !Number.isNaN(v.renovationYear)) {
    input['renovationYear'] = v.renovationYear;
  }
  if (v.hvacAgeYears != null && !Number.isNaN(v.hvacAgeYears)) {
    input['hvacAgeYears'] = v.hvacAgeYears;
  }
  if (v.hvacEfficiencyRating != null && !Number.isNaN(v.hvacEfficiencyRating)) {
    input['hvacEfficiencyRating'] = v.hvacEfficiencyRating;
  }
  if (v.lastEnergyAuditDate instanceof Date) {
    input['lastEnergyAuditDate'] = toIsoDateLocal(v.lastEnergyAuditDate);
  }
  if (v.lightingPowerDensity != null && !Number.isNaN(v.lightingPowerDensity)) {
    input['lightingPowerDensity'] = v.lightingPowerDensity;
  }
  const bmsVen = v.bmsVendor?.trim();
  if (bmsVen) input['bmsVendor'] = bmsVen;
  const epc = v.epcRating?.trim();
  if (epc) input['epcRating'] = epc;
  if (
    v.onsiteGenerationCapacityKw != null &&
    !Number.isNaN(v.onsiteGenerationCapacityKw)
  ) {
    input['onsiteGenerationCapacityKw'] = v.onsiteGenerationCapacityKw;
  }
  const ca = v.createdAt?.trim();
  if (ca) input['createdAt'] = ca;
  const ua = v.updatedAt?.trim();
  if (ua) input['updatedAt'] = ua;

  return parseBuildingDTO(input);
}

export function hydrateBuildingFormFromPartial(
  form: BuildingFormGroup,
  patch: Partial<BuildingDTO>,
  fallbackOrganizationId: string,
  fallbackRegionId: string,
  fallbackBranchId: string,
  fallbackBuildingId: string
): void {
  form.controls.organizationId.patchValue(patch.organizationId ?? fallbackOrganizationId, {
    emitEvent: false
  });
  form.controls.regionId.patchValue(patch.regionId ?? fallbackRegionId, { emitEvent: false });
  form.controls.branchId.patchValue(patch.branchId ?? fallbackBranchId, { emitEvent: false });
  form.controls.id.patchValue(
    patch.id && typeof patch.id === 'string' ? patch.id : fallbackBuildingId,
    { emitEvent: false }
  );

  if (typeof patch.name === 'string') form.controls.name.setValue(patch.name, { emitEvent: false });

  const op = OperationalStatusSchema.options as readonly string[];
  if (typeof patch.status === 'string' && op.includes(patch.status)) {
    form.controls.status.setValue(patch.status as OperationalStatus, { emitEvent: false });
  }

  const bu = BuildingUsageTypeSchema.options as readonly string[];
  if (typeof patch.usageTypeEnum === 'string' && bu.includes(patch.usageTypeEnum)) {
    form.controls.usageTypeEnum.setValue(patch.usageTypeEnum as BuildingUsageType, { emitEvent: false });
  }
  if (typeof patch.usageType === 'string') {
    form.controls.usageType.setValue(patch.usageType, { emitEvent: false });
  } else if (patch.usageType === undefined) {
    form.controls.usageType.setValue(null, { emitEvent: false });
  }

  if (typeof patch.m2Surface === 'number') {
    form.controls.m2Surface.setValue(patch.m2Surface, { emitEvent: false });
  }
  if (typeof patch.m3Volume === 'number') {
    form.controls.m3Volume.setValue(patch.m3Volume, { emitEvent: false });
  }
  if (typeof patch.footprintM2 === 'number') {
    form.controls.footprintM2.setValue(patch.footprintM2, { emitEvent: false });
  } else if (patch.footprintM2 === undefined) {
    form.controls.footprintM2.setValue(null, { emitEvent: false });
  }

  if (typeof patch.floorsCount === 'number') {
    form.controls.floorsCount.setValue(patch.floorsCount, { emitEvent: false });
  }
  if (typeof patch.yearBuilt === 'number') {
    form.controls.yearBuilt.setValue(patch.yearBuilt, { emitEvent: false });
  }
  if (typeof patch.renovationYear === 'number') {
    form.controls.renovationYear.setValue(patch.renovationYear, { emitEvent: false });
  } else if (patch.renovationYear === undefined) {
    form.controls.renovationYear.setValue(null, { emitEvent: false });
  }

  const iq = BuildingInsulationQualitySchema.options as readonly string[];
  if (typeof patch.insulationQuality === 'string' && iq.includes(patch.insulationQuality)) {
    form.controls.insulationQuality.setValue(patch.insulationQuality as BuildingInsulationQuality, {
      emitEvent: false
    });
  }

  if (typeof patch.windowWallRatio === 'number') {
    form.controls.windowWallRatio.setValue(patch.windowWallRatio, { emitEvent: false });
  }

  const rt = BuildingRoofTypeSchema.options as readonly string[];
  if (typeof patch.roofType === 'string' && rt.includes(patch.roofType)) {
    form.controls.roofType.setValue(patch.roofType as BuildingRoofType, { emitEvent: false });
  }

  const coord = patch.coordinates;
  if (coord && typeof coord.lat === 'number' && typeof coord.lng === 'number') {
    form.controls.lat.setValue(coord.lat, { emitEvent: false });
    form.controls.lng.setValue(coord.lng, { emitEvent: false });
  } else {
    form.controls.lat.setValue(0, { emitEvent: false });
    form.controls.lng.setValue(0, { emitEvent: false });
  }

  const hv = HvacTypeSchema.options as readonly string[];
  if (typeof patch.hvacType === 'string' && hv.includes(patch.hvacType)) {
    form.controls.hvacType.setValue(patch.hvacType as HvacType, { emitEvent: false });
  }

  if (typeof patch.hvacAgeYears === 'number') {
    form.controls.hvacAgeYears.setValue(patch.hvacAgeYears, { emitEvent: false });
  } else if (patch.hvacAgeYears === undefined) {
    form.controls.hvacAgeYears.setValue(null, { emitEvent: false });
  }
  if (typeof patch.hvacEfficiencyRating === 'number') {
    form.controls.hvacEfficiencyRating.setValue(patch.hvacEfficiencyRating, { emitEvent: false });
  } else if (patch.hvacEfficiencyRating === undefined) {
    form.controls.hvacEfficiencyRating.setValue(null, { emitEvent: false });
  }

  const ms = BuildingMaintenanceStatusSchema.options as readonly string[];
  if (typeof patch.maintenanceStatus === 'string' && ms.includes(patch.maintenanceStatus)) {
    form.controls.maintenanceStatus.setValue(patch.maintenanceStatus as BuildingMaintenanceStatus, {
      emitEvent: false
    });
  }

  if (typeof patch.lastEnergyAuditDate === 'string' && patch.lastEnergyAuditDate.trim()) {
    form.controls.lastEnergyAuditDate.setValue(
      parseIsoDateToLocal(patch.lastEnergyAuditDate) ?? null,
      { emitEvent: false }
    );
  } else {
    form.controls.lastEnergyAuditDate.setValue(null, { emitEvent: false });
  }

  const mf = MainFuelTypeSchema.options as readonly string[];
  if (typeof patch.mainFuelType === 'string' && mf.includes(patch.mainFuelType)) {
    form.controls.mainFuelType.setValue(patch.mainFuelType as MainFuelType, { emitEvent: false });
  }

  const lt = BuildingLightingTechnologySchema.options as readonly string[];
  if (typeof patch.lightingTechnology === 'string' && lt.includes(patch.lightingTechnology)) {
    form.controls.lightingTechnology.setValue(patch.lightingTechnology as BuildingLightingTechnology, {
      emitEvent: false
    });
  }

  if (typeof patch.lightingPowerDensity === 'number') {
    form.controls.lightingPowerDensity.setValue(patch.lightingPowerDensity, { emitEvent: false });
  } else if (patch.lightingPowerDensity === undefined) {
    form.controls.lightingPowerDensity.setValue(null, { emitEvent: false });
  }

  if (typeof patch.hasBms === 'boolean') {
    form.controls.hasBms.setValue(patch.hasBms, { emitEvent: false });
  }
  if (typeof patch.bmsVendor === 'string') {
    form.controls.bmsVendor.setValue(patch.bmsVendor, { emitEvent: false });
  } else if (patch.bmsVendor === undefined) {
    form.controls.bmsVendor.setValue(null, { emitEvent: false });
  }

  if (Array.isArray(patch.bmsProtocols)) {
    form.controls.bmsProtocolsText.setValue(
      patch.bmsProtocols.filter((x): x is string => typeof x === 'string' && Boolean(x.trim())).join(', '),
      { emitEvent: false }
    );
  }

  if (typeof patch.hasSmartMetering === 'boolean') {
    form.controls.hasSmartMetering.setValue(patch.hasSmartMetering, { emitEvent: false });
  }

  const dg = BuildingDataGranularitySchema.options as readonly string[];
  if (typeof patch.dataGranularity === 'string' && dg.includes(patch.dataGranularity)) {
    form.controls.dataGranularity.setValue(patch.dataGranularity as BuildingDataGranularity, {
      emitEvent: false
    });
  }

  const st = BuildingSubmeteringTopologySchema.options as readonly string[];
  if (typeof patch.submeteringTopology === 'string' && st.includes(patch.submeteringTopology)) {
    form.controls.submeteringTopology.setValue(patch.submeteringTopology as BuildingSubmeteringTopology, {
      emitEvent: false
    });
  }

  if (Array.isArray(patch.buildingCertifications)) {
    form.controls.buildingCertificationsText.setValue(
      patch.buildingCertifications
        .filter((x): x is string => typeof x === 'string' && Boolean(x.trim()))
        .join(', '),
      { emitEvent: false }
    );
  }

  if (typeof patch.epcRating === 'string') {
    form.controls.epcRating.setValue(patch.epcRating, { emitEvent: false });
  } else if (patch.epcRating === undefined) {
    form.controls.epcRating.setValue(null, { emitEvent: false });
  }

  if (typeof patch.onsiteGenerationCapacityKw === 'number') {
    form.controls.onsiteGenerationCapacityKw.setValue(patch.onsiteGenerationCapacityKw, {
      emitEvent: false
    });
  } else if (patch.onsiteGenerationCapacityKw === undefined) {
    form.controls.onsiteGenerationCapacityKw.setValue(null, { emitEvent: false });
  }

  if (typeof patch.airQualitySensors === 'boolean') {
    form.controls.airQualitySensors.setValue(patch.airQualitySensors, { emitEvent: false });
  }
  if (typeof patch.waterRecyclingSystem === 'boolean') {
    form.controls.waterRecyclingSystem.setValue(patch.waterRecyclingSystem, { emitEvent: false });
  }
  if (typeof patch.evChargingPoints === 'number') {
    form.controls.evChargingPoints.setValue(patch.evChargingPoints, { emitEvent: false });
  }

  if (typeof patch.createdAt === 'string') {
    form.controls.createdAt.setValue(patch.createdAt, { emitEvent: false });
  }
  if (typeof patch.updatedAt === 'string') {
    form.controls.updatedAt.setValue(patch.updatedAt, { emitEvent: false });
  }
}
