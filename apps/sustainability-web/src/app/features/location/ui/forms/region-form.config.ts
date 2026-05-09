/**
 * Definición declarativa del formulario de región.
 * Alineado con @sms/common RegionDTOSchema / RegionDTO y esquemas exportados (`ClimateZoneSchema`, …).
 */

import type { ValidatorFn } from '@angular/forms';
import { Validators } from '@angular/forms';
import type { FormBuilder, FormControl, FormGroup } from '@angular/forms';

import type { RegionDTO } from '@sms/common';
import { withHelp } from './form-help.util';
import {
  CarbonMarketTypeSchema,
  ClimateZoneSchema,
  EconomicAreaSchema,
  LifecycleStatusSchema,
  MaturityLevelSchema,
  parseRegionDTO,
  type CarbonMarketType,
  type ClimateZone,
  type EconomicArea,
  type LifecycleStatus,
  type MaturityLevel
} from '@sms/common';

/** Valores planos del FormGroup (coordenadas y manager desanidan para grid). */
export type RegionFormValue = {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  countryCode: string;
  timezone: string;
  lat: number;
  lng: number;
  climateZone: ClimateZone;
  avgHDD: number;
  avgCDD: number;
  totalRegionalM2: number;
  totalHeadcount: number;
  annualRevenueTarget: number | null;
  gridEmissionFactor: number;
  carbonTaxRate: number;
  carbonMarketType: CarbonMarketType;
  marginalAbatementCost: number;
  renewableEnergyAvailability: number;
  gridRenewableShare: number;
  waterStressIndex: number;
  localRegulationsText: string;
  maturityLevel: MaturityLevel;
  economicArea: EconomicArea;
  regionalManagerName: string;
  regionalManagerEmail: string;
  regionalManagerPhone: string | null;
  regionalReductionTarget: number;
  energyScarcityRisk: number;
  status: LifecycleStatus;
  description: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type RegionFormShape = {
  [K in keyof RegionFormValue]: FormControl<RegionFormValue[K]>;
};

export type RegionFormGroup = FormGroup<RegionFormShape>;

export type RegionFormFieldKind =
  | 'hidden'
  | 'text'
  | 'email'
  | 'textarea'
  | 'integer'
  | 'number'
  | 'select';

export interface SelectOption<T extends string = string> {
  label: string;
  value: T;
}

function optionsOf<T extends string>(values: readonly T[]): SelectOption<T>[] {
  return values.map((v) => ({ label: v, value: v }));
}

export const REGION_FORM_ENUM_OPTIONS = Object.freeze({
  climateZone: optionsOf(ClimateZoneSchema.options as readonly ClimateZone[]),
  carbonMarketType: optionsOf(CarbonMarketTypeSchema.options as readonly CarbonMarketType[]),
  maturityLevel: optionsOf(MaturityLevelSchema.options as readonly MaturityLevel[]),
  economicArea: optionsOf(EconomicAreaSchema.options as readonly EconomicArea[]),
  lifecycleStatus: optionsOf(LifecycleStatusSchema.options as readonly LifecycleStatus[])
});

export interface RegionFormFieldDef<K extends keyof RegionFormValue = keyof RegionFormValue> {
  readonly key: K;
  readonly label: string;
  readonly kind: RegionFormFieldKind;
  readonly mdCols: 4 | 6 | 8 | 12;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly readonly?: boolean;
  readonly enumKey?: keyof typeof REGION_FORM_ENUM_OPTIONS;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly patternRegex?: RegExp;
  readonly patternHint?: string;
  /** Texto del icono de ayuda al lado del label (opcional). */
  readonly help?: string;
}

export interface RegionFormTabDef {
  readonly id: string;
  readonly label: string;
  readonly headline?: string;
  readonly fields: ReadonlyArray<RegionFormFieldDef>;
}

const ISO_TWO_LETTER = /^[A-Za-z]{2}$/;

/** Validadores coherentes con RegionDTOSchema (y UX angular). */
export function regionFieldValidators(meta: RegionFormFieldDef): ValidatorFn[] {
  const v: ValidatorFn[] = [];
  if (meta.required) {
    if (
      meta.kind === 'hidden' ||
      meta.kind === 'textarea' ||
      meta.kind === 'text' ||
      meta.kind === 'email' ||
      meta.kind === 'integer' ||
      meta.kind === 'number' ||
      meta.kind === 'select'
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

/** Patrón país ISO‑3166 alfa‑2 sin depender del catálogo de países en common. */
const COUNTRY_HINT = 'Código país ISO‑3166‑1 alpha‑2 (ej. ES, MX).';

const REGION_FORM_TABS_RAW: ReadonlyArray<RegionFormTabDef> = Object.freeze([
  {
    id: 'general',
    label: 'General',
    headline: 'Identidad, geo-analítica y estado',
    fields: [
      { key: 'id', label: 'Region ID', kind: 'hidden', mdCols: 12, required: true },
      { key: 'organizationId', label: 'Organization ID', kind: 'hidden', mdCols: 12, required: true },
      { key: 'name', label: 'Nombre región', kind: 'text', mdCols: 8, required: true },
      { key: 'code', label: 'Código corto', kind: 'text', mdCols: 4, required: true },
      {
        key: 'countryCode',
        label: 'País (ISO‑2)',
        kind: 'text',
        mdCols: 4,
        required: true,
        placeholder: 'ES',
        patternRegex: ISO_TWO_LETTER,
        patternHint: COUNTRY_HINT
      },
      {
        key: 'timezone',
        label: 'Zona horaria (IANA)',
        kind: 'text',
        mdCols: 8,
        required: true,
        placeholder: 'Europe/Madrid'
      },
      { key: 'lat', label: 'Latitud', kind: 'number', mdCols: 6, required: true, min: -90, max: 90, step: 0.000001 },
      { key: 'lng', label: 'Longitud', kind: 'number', mdCols: 6, required: true, min: -180, max: 180, step: 0.000001 },
      {
        key: 'climateZone',
        label: 'Zona climática',
        kind: 'select',
        mdCols: 6,
        enumKey: 'climateZone',
        required: true
      },
      { key: 'avgHDD', label: 'HDD medio (annual)', kind: 'number', mdCols: 6, required: true, min: 0 },
      { key: 'avgCDD', label: 'CDD medio (annual)', kind: 'number', mdCols: 6, required: true, min: 0 },
      {
        key: 'status',
        label: 'Estado',
        kind: 'select',
        mdCols: 4,
        enumKey: 'lifecycleStatus',
        required: true
      },
      {
        key: 'description',
        label: 'Descripción (legacy)',
        kind: 'textarea',
        mdCols: 12,
        placeholder: '(opcional)'
      }
    ]
  },
  {
    id: 'esg',
    label: 'ESG energía',
    headline: 'Intensidades de red y riesgos ambientales locales',
    fields: [
      {
        key: 'gridEmissionFactor',
        label: 'Factor emisiones grid (tCO₂e / unidad proceso)',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        step: 0.0001
      },
      {
        key: 'renewableEnergyAvailability',
        label: 'Disponibilidad energía renovable (0–1)',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        max: 1,
        step: 0.01
      },
      {
        key: 'gridRenewableShare',
        label: 'Cuota renovable en red — % estimado',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        max: 100,
        step: 0.1
      },
      {
        key: 'waterStressIndex',
        label: 'Índice estrés hídrico (0–1)',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        max: 1,
        step: 0.01
      },
      {
        key: 'localRegulationsText',
        label: 'Normativa local / compliance (lista, separada por comas)',
        kind: 'textarea',
        mdCols: 12,
        placeholder: 'EU ETS, ley nacional…'
      }
    ]
  },
  {
    id: 'financial',
    label: 'Financiero',
    headline: 'KPI económicos y mercados de carbono',
    fields: [
      {
        key: 'totalRegionalM2',
        label: 'Superficie regional total (m²)',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        step: 1
      },
      {
        key: 'totalHeadcount',
        label: 'Headcount regional',
        kind: 'integer',
        mdCols: 6,
        required: true,
        min: 0,
        step: 1
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
        key: 'carbonTaxRate',
        label: 'Tipo impositivo carbono (unidad monetaria / tCO₂e)',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        step: 0.01
      },
      {
        key: 'marginalAbatementCost',
        label: 'Costo marginal de abatimiento (MAC)',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        step: 0.01
      },
      {
        key: 'carbonMarketType',
        label: 'Tipo mercado carbono',
        kind: 'select',
        mdCols: 6,
        enumKey: 'carbonMarketType',
        required: true
      }
    ]
  },
  {
    id: 'carbon',
    label: 'Metas carbono',
    headline: 'Reducción y riesgo energético',
    fields: [
      {
        key: 'regionalReductionTarget',
        label: 'Meta regional de reducción (Δ o fracción según proceso)',
        kind: 'number',
        mdCols: 8,
        required: true,
        step: 0.01
      },
      {
        key: 'energyScarcityRisk',
        label: 'Riesgo escasez energética (0–1)',
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
    id: 'governance',
    label: 'Gobernanza',
    headline: 'Madurez de datos, área económica y responsable regional',
    fields: [
      {
        key: 'maturityLevel',
        label: 'Nivel de madurez datos / IoT',
        kind: 'select',
        mdCols: 6,
        enumKey: 'maturityLevel',
        required: true
      },
      {
        key: 'economicArea',
        label: 'Área económica',
        kind: 'select',
        mdCols: 6,
        enumKey: 'economicArea',
        required: true
      },
      { key: 'regionalManagerName', label: 'Nombre responsable regional', kind: 'text', mdCols: 6, required: true },
      { key: 'regionalManagerEmail', label: 'Email responsable', kind: 'email', mdCols: 6, required: true },
      {
        key: 'regionalManagerPhone',
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
  }
]);

/**
 * Texto de ayuda contextual por campo del formulario Region.
 * Pensado para explicar el rol del dato en cálculos ESG y financieros.
 */
const REGION_FIELD_HELP: Partial<Record<keyof RegionFormValue, string>> = {
  name:
    'Nombre legible de la región (ej. "EMEA Sur", "Cono Sur"). ' +
    'Es la unidad de agregación entre la organización y sus sucursales.',
  code:
    'Código corto único interno para la región (3–6 chars, ej. "EU-S"). ' +
    'Se usa en exports CSV y URLs de dashboards.',
  countryCode:
    'País principal de la región en formato ISO‑3166‑1 alpha‑2 (ej. "AR", "ES", "IL"). ' +
    'Determina el factor de emisión de red por defecto y la regulación aplicable.',
  timezone:
    'Zona horaria de referencia en formato IANA (ej. "Europe/Madrid"). ' +
    'Se usa para alinear lecturas multi-país y respetar tarifas con franjas horarias.',
  lat: 'Latitud del centroide de la región (decimal, -90 a 90). Útil en mapas y geo-análisis.',
  lng: 'Longitud del centroide de la región (decimal, -180 a 180).',
  climateZone:
    'Zona climática ASHRAE/IECC. Determina baselines de calefacción/refrigeración ' +
    'y cuántos HDD/CDD se esperan al año.',
  avgHDD:
    'Heating Degree Days promedio anual. Cuanto más alto, más demanda de calefacción. ' +
    'Se usa para normalizar consumo invernal vs base climática.',
  avgCDD:
    'Cooling Degree Days promedio anual. Cuanto más alto, más demanda de refrigeración. ' +
    'Se usa para normalizar consumo eléctrico de A/C.',
  status: 'Estado de la región: ACTIVE (operativa) o INACTIVE (cerrada/migrada).',
  description:
    'Descripción libre de la región (notas internas, contexto histórico). Opcional.',
  gridEmissionFactor:
    'Factor de emisiones de la red eléctrica local en tCO₂e por unidad del proceso ' +
    '(típicamente kgCO₂/kWh × 0.001). Crítico para Scope 2 ubicación.',
  renewableEnergyAvailability:
    'Fracción 0–1 de disponibilidad de oferta renovable contratable en la región ' +
    '(PPA, certificados verdes). 1 = totalmente disponible.',
  gridRenewableShare:
    'Porcentaje 0–100 de generación renovable en el mix eléctrico nacional/regional. ' +
    'Se usa para Scope 2 con método mercado vs ubicación.',
  waterStressIndex:
    'Índice de estrés hídrico WRI Aqueduct (0–1, 1 = estrés extremo). Material para ' +
    'CSRD/SASB en sectores intensivos en agua.',
  localRegulationsText:
    'Lista (separada por comas) de regímenes regulatorios aplicables (EU ETS, ' +
    'ley nacional de eficiencia, etc.). Se usa en checks de compliance.',
  totalRegionalM2:
    'Superficie total bajo control operacional en la región (m²). Denominador de ' +
    'intensidades regionales.',
  totalHeadcount:
    'Cantidad de empleados FTE en la región. Denominador de intensidades sociales (S de ESG).',
  annualRevenueTarget:
    'Objetivo de ingresos anuales para la región (en moneda operativa). Opcional. ' +
    'Habilita la métrica de intensidad por revenue (kgCO₂/$).',
  carbonTaxRate:
    'Tasa impositiva al carbono local (moneda / tCO₂e). Se usa en el costo total ' +
    'de procastinación de acciones de reducción.',
  marginalAbatementCost:
    'Costo marginal de abatimiento (MAC) regional. Pivote para priorizar acciones ' +
    'en la curva MACC.',
  carbonMarketType:
    'Tipo de mercado de carbono al que está expuesta la región: ETS, voluntary, none, etc.',
  regionalReductionTarget:
    'Meta regional de reducción de emisiones. La interpretación (Δ absoluto vs %) ' +
    'depende del proceso interno; respetar la convención del baseline.',
  energyScarcityRisk:
    'Riesgo 0–1 de escasez/cortes energéticos. Alimenta los escenarios de continuidad ' +
    'y la decisión de instalar respaldo.',
  maturityLevel:
    'Nivel de madurez del dato/IoT en la región: MANUAL (carga manual), HYBRID, ' +
    'AUTO_IOT (telemetría completa). Afecta los SLAs de calidad esperados.',
  economicArea:
    'Área económica (EMEA, AMERICAS, APAC). Sirve para agrupar reportes ejecutivos.',
  regionalManagerName: 'Nombre del responsable regional (operations / sustainability).',
  regionalManagerEmail:
    'Email del responsable regional. Recibe alertas de la región y aprobaciones de acciones.',
  regionalManagerPhone:
    'Teléfono del responsable regional (formato internacional). Opcional, mín. 3 chars si se carga.',
  createdAt: 'Marca temporal RFC3339 de creación. Sólo lectura.',
  updatedAt: 'Marca temporal RFC3339 de la última modificación. Sólo lectura.'
};

/** Tabs con `help` inyectado desde `REGION_FIELD_HELP`. */
export const REGION_FORM_TABS: ReadonlyArray<RegionFormTabDef> = Object.freeze(
  withHelp(REGION_FORM_TABS_RAW, REGION_FIELD_HELP as Record<string, string>)
);

export const REGION_FIELD_GRID_CLASS: Record<RegionFormFieldDef['mdCols'], string> = {
  4: 'col-span-12 md:col-span-4',
  6: 'col-span-12 md:col-span-6',
  8: 'col-span-12 md:col-span-8',
  12: 'col-span-12'
};

export const REGION_FORM_DEFAULT_VALUE: RegionFormValue = {
  id: '',
  organizationId: '',
  name: '',
  code: '',
  countryCode: '',
  timezone: 'UTC',
  lat: 0,
  lng: 0,
  climateZone: (ClimateZoneSchema.options[0] ?? 'TEMPERATE') as ClimateZone,
  avgHDD: 0,
  avgCDD: 0,
  totalRegionalM2: 0,
  totalHeadcount: 0,
  annualRevenueTarget: null,
  gridEmissionFactor: 0,
  carbonTaxRate: 0,
  carbonMarketType: (CarbonMarketTypeSchema.options[0] ?? 'NONE') as CarbonMarketType,
  marginalAbatementCost: 0,
  renewableEnergyAvailability: 0,
  gridRenewableShare: 0,
  waterStressIndex: 0,
  localRegulationsText: '',
  maturityLevel: (MaturityLevelSchema.options[0] ?? 'MANUAL') as MaturityLevel,
  economicArea: (EconomicAreaSchema.options[0] ?? 'EMEA') as EconomicArea,
  regionalManagerName: 'N/A',
  regionalManagerEmail: 'noreply@sms.invalid',
  regionalManagerPhone: null,
  regionalReductionTarget: 0,
  energyScarcityRisk: 0,
  status: (LifecycleStatusSchema.options[0] ?? 'ACTIVE') as LifecycleStatus,
  description: null,
  createdAt: null,
  updatedAt: null
};

const NULLABLE_FIELDS = new Set<keyof RegionFormValue>([
  'annualRevenueTarget',
  'regionalManagerPhone',
  'description',
  'createdAt',
  'updatedAt'
]);

function allFieldDefs(): ReadonlyArray<RegionFormFieldDef> {
  return REGION_FORM_TABS.flatMap((t) => t.fields);
}

export function buildRegionFormGroup(fb: FormBuilder): RegionFormGroup {
  const defaults = REGION_FORM_DEFAULT_VALUE;
  const fbnn = fb.nonNullable;
  const controls = {} as Record<keyof RegionFormValue, FormControl | unknown>;
  for (const meta of allFieldDefs()) {
    const key = meta.key;
    const initial = defaults[key];
    const validators = regionFieldValidators(meta);
    if (NULLABLE_FIELDS.has(key)) {
      controls[key] = fb.control(initial as never, validators);
      continue;
    }
    controls[key] = fbnn.control(initial as never, validators);
  }
  return fb.group(controls as never) as unknown as RegionFormGroup;
}

export function regionFormRawValueToDTO(v: RegionFormValue): RegionDTO {
  const countryCode = v.countryCode.trim().toUpperCase();
  const phone = v.regionalManagerPhone?.trim() ?? '';
  const input: Record<string, unknown> = {
    id: v.id.trim(),
    organizationId: v.organizationId.trim(),
    name: v.name.trim(),
    code: v.code.trim(),
    countryCode,
    timezone: v.timezone.trim(),
    coordinates: { lat: v.lat, lng: v.lng },
    climateZone: v.climateZone,
    avgHDD: v.avgHDD,
    avgCDD: v.avgCDD,
    totalRegionalM2: v.totalRegionalM2,
    totalHeadcount: v.totalHeadcount,
    gridEmissionFactor: v.gridEmissionFactor,
    carbonTaxRate: v.carbonTaxRate,
    carbonMarketType: v.carbonMarketType,
    marginalAbatementCost: v.marginalAbatementCost,
    renewableEnergyAvailability: v.renewableEnergyAvailability,
    gridRenewableShare: v.gridRenewableShare,
    waterStressIndex: v.waterStressIndex,
    localRegulations: v.localRegulationsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    maturityLevel: v.maturityLevel,
    economicArea: v.economicArea,
    regionalManager: {
      name: v.regionalManagerName.trim(),
      email: v.regionalManagerEmail.trim(),
      ...(phone ? { phone } : {})
    },
    regionalReductionTarget: v.regionalReductionTarget,
    energyScarcityRisk: v.energyScarcityRisk,
    status: v.status
  };
  if (v.annualRevenueTarget != null && !Number.isNaN(v.annualRevenueTarget)) {
    input['annualRevenueTarget'] = v.annualRevenueTarget;
  }
  const description = v.description?.trim();
  if (description) input['description'] = description;
  const createdAt = v.createdAt?.trim();
  if (createdAt) input['createdAt'] = createdAt;
  const updatedAt = v.updatedAt?.trim();
  if (updatedAt) input['updatedAt'] = updatedAt;
  return parseRegionDTO(input);
}

export function hydrateRegionFormFromPartial(
  form: RegionFormGroup,
  patch: Partial<RegionDTO>,
  fallbackOrganizationId: string,
  fallbackRegionId: string
): void {
  form.controls.organizationId.patchValue(patch.organizationId ?? fallbackOrganizationId, {
    emitEvent: false
  });
  form.controls.id.patchValue(
    patch.id && typeof patch.id === 'string' ? patch.id : fallbackRegionId,
    {
      emitEvent: false
    }
  );

  if (typeof patch.name === 'string') {
    form.controls.name.setValue(patch.name, { emitEvent: false });
  }
  if (typeof patch.code === 'string') {
    form.controls.code.setValue(patch.code, { emitEvent: false });
  }
  if (typeof patch.countryCode === 'string') {
    form.controls.countryCode.setValue(patch.countryCode, { emitEvent: false });
  }
  if (typeof patch.timezone === 'string') {
    form.controls.timezone.setValue(patch.timezone, { emitEvent: false });
  }
  if (patch.coordinates) {
    if (typeof patch.coordinates.lat === 'number') {
      form.controls.lat.setValue(patch.coordinates.lat, { emitEvent: false });
    }
    if (typeof patch.coordinates.lng === 'number') {
      form.controls.lng.setValue(patch.coordinates.lng, { emitEvent: false });
    }
  }

  const zones = ClimateZoneSchema.options as readonly string[];
  if (typeof patch.climateZone === 'string' && zones.includes(patch.climateZone)) {
    form.controls.climateZone.setValue(patch.climateZone as ClimateZone, { emitEvent: false });
  }

  if (typeof patch.avgHDD === 'number') {
    form.controls.avgHDD.setValue(patch.avgHDD, { emitEvent: false });
  }
  if (typeof patch.avgCDD === 'number') {
    form.controls.avgCDD.setValue(patch.avgCDD, { emitEvent: false });
  }
  if (typeof patch.totalRegionalM2 === 'number') {
    form.controls.totalRegionalM2.setValue(patch.totalRegionalM2, { emitEvent: false });
  }
  if (typeof patch.totalHeadcount === 'number') {
    form.controls.totalHeadcount.setValue(patch.totalHeadcount, { emitEvent: false });
  }
  if (typeof patch.annualRevenueTarget === 'number') {
    form.controls.annualRevenueTarget.setValue(patch.annualRevenueTarget, { emitEvent: false });
  } else if (patch.annualRevenueTarget === undefined) {
    form.controls.annualRevenueTarget.setValue(null, { emitEvent: false });
  }

  if (typeof patch.gridEmissionFactor === 'number') {
    form.controls.gridEmissionFactor.setValue(patch.gridEmissionFactor, { emitEvent: false });
  }
  if (typeof patch.carbonTaxRate === 'number') {
    form.controls.carbonTaxRate.setValue(patch.carbonTaxRate, { emitEvent: false });
  }
  const marketTypes = CarbonMarketTypeSchema.options as readonly string[];
  if (typeof patch.carbonMarketType === 'string' && marketTypes.includes(patch.carbonMarketType)) {
    form.controls.carbonMarketType.setValue(patch.carbonMarketType as CarbonMarketType, { emitEvent: false });
  }
  if (typeof patch.marginalAbatementCost === 'number') {
    form.controls.marginalAbatementCost.setValue(patch.marginalAbatementCost, { emitEvent: false });
  }
  if (typeof patch.renewableEnergyAvailability === 'number') {
    form.controls.renewableEnergyAvailability.setValue(patch.renewableEnergyAvailability, {
      emitEvent: false
    });
  }
  if (typeof patch.gridRenewableShare === 'number') {
    form.controls.gridRenewableShare.setValue(patch.gridRenewableShare, { emitEvent: false });
  }
  if (typeof patch.waterStressIndex === 'number') {
    form.controls.waterStressIndex.setValue(patch.waterStressIndex, { emitEvent: false });
  }

  if (Array.isArray(patch.localRegulations)) {
    const lines = patch.localRegulations.filter(
      (x): x is string => typeof x === 'string' && Boolean(x.trim())
    );
    form.controls.localRegulationsText.setValue(lines.join(', '), { emitEvent: false });
  }

  const maturities = MaturityLevelSchema.options as readonly string[];
  if (typeof patch.maturityLevel === 'string' && maturities.includes(patch.maturityLevel)) {
    form.controls.maturityLevel.setValue(patch.maturityLevel as MaturityLevel, { emitEvent: false });
  }
  const economic = EconomicAreaSchema.options as readonly string[];
  if (typeof patch.economicArea === 'string' && economic.includes(patch.economicArea)) {
    form.controls.economicArea.setValue(patch.economicArea as EconomicArea, { emitEvent: false });
  }

  const rm = patch.regionalManager;
  if (rm) {
    if (typeof rm.name === 'string') {
      form.controls.regionalManagerName.setValue(rm.name, { emitEvent: false });
    }
    if (typeof rm.email === 'string') {
      form.controls.regionalManagerEmail.setValue(rm.email, { emitEvent: false });
    }
    if (typeof rm.phone === 'string') {
      form.controls.regionalManagerPhone.setValue(rm.phone, { emitEvent: false });
    } else {
      form.controls.regionalManagerPhone.setValue(null, { emitEvent: false });
    }
  }

  if (typeof patch.regionalReductionTarget === 'number') {
    form.controls.regionalReductionTarget.setValue(patch.regionalReductionTarget, { emitEvent: false });
  }
  if (typeof patch.energyScarcityRisk === 'number') {
    form.controls.energyScarcityRisk.setValue(patch.energyScarcityRisk, { emitEvent: false });
  }
  if (patch.status === 'ACTIVE' || patch.status === 'INACTIVE') {
    form.controls.status.setValue(patch.status, { emitEvent: false });
  }
  if (typeof patch.description === 'string') {
    form.controls.description.setValue(patch.description, { emitEvent: false });
  } else if (patch.description === undefined) {
    form.controls.description.setValue(null, { emitEvent: false });
  }

  if (typeof patch.createdAt === 'string') {
    form.controls.createdAt.setValue(patch.createdAt, { emitEvent: false });
  }
  if (typeof patch.updatedAt === 'string') {
    form.controls.updatedAt.setValue(patch.updatedAt, { emitEvent: false });
  }
}
