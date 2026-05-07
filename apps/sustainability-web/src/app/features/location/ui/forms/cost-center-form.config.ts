/**
 * Formulario declarativo de centro de coste · CostCenterDTOSchema / CostCenterDTO (@sms/common).
 */

import type { ValidatorFn } from '@angular/forms';
import { Validators } from '@angular/forms';
import type { FormBuilder, FormControl, FormGroup } from '@angular/forms';

import type { CostCenterDTO } from '@sms/common';
import {
  CostAllocationMethodSchema,
  CostCenterForecastModelSchema,
  CostCenterTypeSchema,
  LifecycleStatusSchema,
  parseCostCenterDTO,
  type CostAllocationMethod,
  type CostCenterForecastModel,
  type CostCenterType,
  type LifecycleStatus
} from '@sms/common';

export type CostCenterFormValue = {
  id: string;
  organizationId: string;
  name: string;
  externalId: string | null;
  parentId: string | null;
  branchId: string | null;
  buildingId: string | null;
  annualBudget: number;
  currency: string;
  budgetThresholdAlert: number;
  carbonBudgetTons: number | null;
  carbonShadowPrice: number | null;
  budgetSensitivityIndex: number;
  fiscalYear: number;
  headcount: number | null;
  floorAreaSqm: number | null;
  productionUnitName: string | null;
  targetIntensity: number | null;
  renewableEnergyTarget: number;
  allocationMethod: CostAllocationMethod;
  percentage: number;
  isShared: boolean;
  allocationLastReviewDate: Date | null;
  approvedBy: string | null;
  type: CostCenterType;
  forecastModel: CostCenterForecastModel;
  managerEmail: string | null;
  operatingHoursId: string | null;
  status: LifecycleStatus;
  tagsJson: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CostCenterFormShape = { [K in keyof CostCenterFormValue]: FormControl<CostCenterFormValue[K]> };
export type CostCenterFormGroup = FormGroup<CostCenterFormShape>;

export type CostCenterFormFieldKind =
  | 'hidden'
  | 'text'
  | 'textarea'
  | 'integer'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'email'
  | 'date';

export interface SelectOption<T extends string = string> {
  label: string;
  value: T;
}

function optionsOf<T extends string>(values: readonly T[]): SelectOption<T>[] {
  return values.map((v) => ({ label: v, value: v }));
}

export const COST_CENTER_FORM_ENUM_OPTIONS = Object.freeze({
  costAllocationMethod: optionsOf(CostAllocationMethodSchema.options as readonly CostAllocationMethod[]),
  lifecycleStatus: optionsOf(LifecycleStatusSchema.options as readonly LifecycleStatus[]),
  costCenterType: optionsOf(CostCenterTypeSchema.options as readonly CostCenterType[]),
  costCenterForecastModel: optionsOf(CostCenterForecastModelSchema.options as readonly CostCenterForecastModel[])
});

export interface CostCenterFormFieldDef<K extends keyof CostCenterFormValue = keyof CostCenterFormValue> {
  readonly key: K;
  readonly label: string;
  readonly kind: CostCenterFormFieldKind;
  readonly mdCols: 4 | 6 | 8 | 12;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly readonly?: boolean;
  readonly enumKey?: keyof typeof COST_CENTER_FORM_ENUM_OPTIONS;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}

export interface CostCenterFormTabDef {
  readonly id: string;
  readonly label: string;
  readonly headline?: string;
  readonly fields: ReadonlyArray<CostCenterFormFieldDef>;
}

export function costCenterFieldValidators(meta: CostCenterFormFieldDef): ValidatorFn[] {
  const v: ValidatorFn[] = [];
  if (meta.kind === 'checkbox') return v;

  if (meta.kind === 'email') {
    if (meta.required) {
      v.push(Validators.required, Validators.email);
    } else {
      v.push((control) => {
        const raw = control.value;
        if (raw == null || String(raw).trim() === '') return null;
        return Validators.email(control);
      });
    }
    return v;
  }

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

export const COST_CENTER_FORM_TABS: ReadonlyArray<CostCenterFormTabDef> = Object.freeze([
  {
    id: 'general',
    label: 'General',
    headline: 'Identidad, clase operativa y contacto',
    fields: [
      { key: 'id', label: 'Cost Center ID', kind: 'hidden', mdCols: 12, required: true },
      {
        key: 'organizationId',
        label: 'Organization ID',
        kind: 'hidden',
        mdCols: 12,
        required: true
      },
      { key: 'branchId', label: 'Branch ID', kind: 'hidden', mdCols: 12 },
      { key: 'buildingId', label: 'Building ID', kind: 'hidden', mdCols: 12 },
      {
        key: 'name',
        label: 'Nombre del centro de coste',
        kind: 'text',
        mdCols: 8,
        required: true
      },
      {
        key: 'externalId',
        label: 'ID externo',
        kind: 'text',
        mdCols: 4,
        placeholder: '(opcional)'
      },
      {
        key: 'parentId',
        label: 'Parent cost center ID',
        kind: 'text',
        mdCols: 6,
        placeholder: '(opcional)'
      },
      {
        key: 'type',
        label: 'Tipo de centro',
        kind: 'select',
        mdCols: 6,
        enumKey: 'costCenterType',
        required: true
      },
      {
        key: 'forecastModel',
        label: 'Modelo de previsión',
        kind: 'select',
        mdCols: 6,
        enumKey: 'costCenterForecastModel',
        required: true
      },
      {
        key: 'status',
        label: 'Estado',
        kind: 'select',
        mdCols: 6,
        enumKey: 'lifecycleStatus',
        required: true
      },
      {
        key: 'managerEmail',
        label: 'Email del responsable',
        kind: 'email',
        mdCols: 6,
        placeholder: '(opcional)'
      },
      {
        key: 'operatingHoursId',
        label: 'ID horario operativo',
        kind: 'text',
        mdCols: 6,
        placeholder: '(opcional)'
      }
    ]
  },
  {
    id: 'esg_targets',
    label: 'Metas carbono · ESG',
    headline: 'Intensidades, huella budgetada y renovables',
    fields: [
      {
        key: 'carbonBudgetTons',
        label: 'Presupuesto de carbono (t CO₂e/año)',
        kind: 'number',
        mdCols: 6,
        min: 0,
        step: 0.001,
        placeholder: '(opcional)'
      },
      {
        key: 'carbonShadowPrice',
        label: 'Precio sombra carbono',
        kind: 'number',
        mdCols: 6,
        min: 0,
        step: 0.01,
        placeholder: '(opcional)'
      },
      {
        key: 'targetIntensity',
        label: 'Intensidad objetivo (unidad definida por negocio)',
        kind: 'number',
        mdCols: 6,
        min: 0,
        step: 0.0001,
        placeholder: '(opcional)'
      },
      {
        key: 'renewableEnergyTarget',
        label: 'Meta renovable (0–100 %)',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        max: 100,
        step: 0.5
      }
    ]
  },
  {
    id: 'financial',
    label: 'Parámetros financieros',
    headline: 'Presupuesto anual y sensibilidades',
    fields: [
      {
        key: 'annualBudget',
        label: 'Presupuesto anual',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        step: 0.01
      },
      {
        key: 'currency',
        label: 'Moneda (máx. 8 caracteres)',
        kind: 'text',
        mdCols: 6,
        required: true,
        placeholder: 'ILS · EUR · USD …'
      },
      {
        key: 'budgetThresholdAlert',
        label: 'Umbral alerta consumo budget (0–1)',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        max: 1,
        step: 0.01
      },
      {
        key: 'budgetSensitivityIndex',
        label: 'Índice sensibilidad al presupuesto (0–1)',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        max: 1,
        step: 0.01
      },
      {
        key: 'fiscalYear',
        label: 'Año fiscal',
        kind: 'integer',
        mdCols: 6,
        required: true,
        min: 1900,
        max: 9999,
        step: 1
      }
    ]
  },
  {
    id: 'operations',
    label: 'Dimensiones físicas · producción',
    headline: 'Escala organizativa y línea operativa',
    fields: [
      {
        key: 'headcount',
        label: 'Headcount equivalente',
        kind: 'integer',
        mdCols: 6,
        min: 0,
        step: 1,
        placeholder: '(opcional)'
      },
      {
        key: 'floorAreaSqm',
        label: 'Superficie útil (m²)',
        kind: 'number',
        mdCols: 6,
        min: 0,
        step: 0.01,
        placeholder: '(opcional)'
      },
      {
        key: 'productionUnitName',
        label: 'Unidad productiva',
        kind: 'text',
        mdCols: 12,
        placeholder: '(opcional)'
      }
    ]
  },
  {
    id: 'allocation',
    label: 'Asignación de costes',
    headline: 'Método, porcentajes y revisión',
    fields: [
      {
        key: 'allocationMethod',
        label: 'Método de imputación',
        kind: 'select',
        mdCols: 6,
        enumKey: 'costAllocationMethod',
        required: true
      },
      {
        key: 'percentage',
        label: 'Porcentaje asignación (%)',
        kind: 'number',
        mdCols: 6,
        required: true,
        min: 0,
        max: 100,
        step: 0.01
      },
      {
        key: 'isShared',
        label: 'Centro compartido (isShared)',
        kind: 'checkbox',
        mdCols: 12
      },
      {
        key: 'allocationLastReviewDate',
        label: 'Última revisión de asignación',
        kind: 'date',
        mdCols: 6,
        placeholder: '(opcional)'
      },
      {
        key: 'approvedBy',
        label: 'Aprobado por',
        kind: 'text',
        mdCols: 6,
        placeholder: '(opcional)'
      }
    ]
  },
  {
    id: 'metadata',
    label: 'Metadatos',
    headline: 'Etiquetas flexibles y auditoría',
    fields: [
      {
        key: 'tagsJson',
        label: 'tags (JSON clave→valor)',
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

export const COST_CENTER_FIELD_GRID_CLASS: Record<CostCenterFormFieldDef['mdCols'], string> = {
  4: 'col-span-12 md:col-span-4',
  6: 'col-span-12 md:col-span-6',
  8: 'col-span-12 md:col-span-8',
  12: 'col-span-12'
};

function allFieldDefs(): ReadonlyArray<CostCenterFormFieldDef> {
  return COST_CENTER_FORM_TABS.flatMap((t) => t.fields);
}

export const COST_CENTER_FORM_DEFAULT_VALUE: CostCenterFormValue = {
  id: '',
  organizationId: '',
  name: '',
  externalId: null,
  parentId: null,
  branchId: null,
  buildingId: null,
  annualBudget: 0,
  currency: 'ILS',
  budgetThresholdAlert: 0.85,
  carbonBudgetTons: null,
  carbonShadowPrice: null,
  budgetSensitivityIndex: 0.5,
  fiscalYear: new Date().getFullYear(),
  headcount: null,
  floorAreaSqm: null,
  productionUnitName: null,
  targetIntensity: null,
  renewableEnergyTarget: 0,
  allocationMethod: (CostAllocationMethodSchema.options[0] ?? 'SQUARE_METERS') as CostAllocationMethod,
  percentage: 100,
  isShared: false,
  allocationLastReviewDate: null,
  approvedBy: null,
  type: (CostCenterTypeSchema.options[0] ?? 'DEPARTMENT') as CostCenterType,
  forecastModel: (CostCenterForecastModelSchema.options[0] ?? 'STRICT_BUDGET') as CostCenterForecastModel,
  managerEmail: null,
  operatingHoursId: null,
  status: (LifecycleStatusSchema.options[0] ?? 'ACTIVE') as LifecycleStatus,
  tagsJson: '{}',
  createdAt: null,
  updatedAt: null
};

const NULLABLE_FIELDS = new Set<keyof CostCenterFormValue>([
  'externalId',
  'parentId',
  'branchId',
  'buildingId',
  'carbonBudgetTons',
  'carbonShadowPrice',
  'headcount',
  'floorAreaSqm',
  'productionUnitName',
  'targetIntensity',
  'allocationLastReviewDate',
  'approvedBy',
  'managerEmail',
  'operatingHoursId',
  'createdAt',
  'updatedAt'
]);

export function buildCostCenterFormGroup(fb: FormBuilder): CostCenterFormGroup {
  const defaults = COST_CENTER_FORM_DEFAULT_VALUE;
  const fbnn = fb.nonNullable;
  const controls = {} as Record<keyof CostCenterFormValue, FormControl | unknown>;

  for (const meta of allFieldDefs()) {
    const key = meta.key;
    const initial = defaults[key];
    const validators = costCenterFieldValidators(meta);
    if (NULLABLE_FIELDS.has(key)) {
      controls[key] = fb.control(initial as never, validators);
      continue;
    }
    controls[key] = fbnn.control(initial as never, validators);
  }

  return fb.group(controls as never) as unknown as CostCenterFormGroup;
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

function parseTagsJson(raw: string): Record<string, string> {
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

function optionalAllocationReviewIso(v: Date | null): string | undefined {
  if (!(v instanceof Date)) return undefined;
  return toIsoLike(v);
}

export function costCenterFormRawValueToDTO(v: CostCenterFormValue): CostCenterDTO {
  const input: Record<string, unknown> = {
    id: v.id.trim(),
    organizationId: v.organizationId.trim(),
    name: v.name.trim(),
    annualBudget: v.annualBudget,
    currency: v.currency.trim().toUpperCase().slice(0, 8),
    budgetThresholdAlert: v.budgetThresholdAlert,
    budgetSensitivityIndex: v.budgetSensitivityIndex,
    fiscalYear: Math.trunc(v.fiscalYear),
    renewableEnergyTarget: v.renewableEnergyTarget,
    allocationMethod: v.allocationMethod,
    percentage: v.percentage,
    isShared: v.isShared,
    type: v.type,
    forecastModel: v.forecastModel,
    status: v.status,
    tags: parseTagsJson(v.tagsJson)
  };

  const ext = v.externalId?.trim();
  if (ext) input['externalId'] = ext;
  const pid = v.parentId?.trim();
  if (pid) input['parentId'] = pid;
  const bid = v.branchId?.trim();
  if (bid) input['branchId'] = bid;
  const bld = v.buildingId?.trim();
  if (bld) input['buildingId'] = bld;

  const ct = v.carbonBudgetTons;
  if (ct != null && Number.isFinite(ct)) input['carbonBudgetTons'] = ct;

  const csp = v.carbonShadowPrice;
  if (csp != null && Number.isFinite(csp)) input['carbonShadowPrice'] = csp;

  const hc = v.headcount;
  if (hc != null && Number.isFinite(hc)) input['headcount'] = Math.trunc(hc);

  const fa = v.floorAreaSqm;
  if (fa != null && Number.isFinite(fa)) input['floorAreaSqm'] = fa;

  const pun = v.productionUnitName?.trim();
  if (pun) input['productionUnitName'] = pun;

  const ti = v.targetIntensity;
  if (ti != null && Number.isFinite(ti)) input['targetIntensity'] = ti;

  const alc = optionalAllocationReviewIso(v.allocationLastReviewDate);
  if (alc) input['allocationLastReviewDate'] = alc;

  const ap = v.approvedBy?.trim();
  if (ap) input['approvedBy'] = ap;

  const me = v.managerEmail?.trim()?.toLowerCase();
  if (me) input['managerEmail'] = me;

  const oid = v.operatingHoursId?.trim();
  if (oid) input['operatingHoursId'] = oid;

  const ca = v.createdAt?.trim();
  if (ca) input['createdAt'] = ca;

  const ua = v.updatedAt?.trim();
  if (ua) input['updatedAt'] = ua;

  return parseCostCenterDTO(input);
}

/** Metadatos + `organizationId` duplicados en payloads legacy (`orgId`). */
export type CostCenterHydrationPatch = Partial<CostCenterDTO> & { orgId?: string };

export function hydrateCostCenterFormFromPartial(
  form: CostCenterFormGroup,
  patch: CostCenterHydrationPatch
): void {
  const org =
    typeof patch.organizationId === 'string' && patch.organizationId.trim()
      ? patch.organizationId
      : (typeof patch.orgId === 'string' && patch.orgId.trim() ? patch.orgId.trim() : null);
  if (org) form.controls.organizationId.setValue(org, { emitEvent: false });

  if (typeof patch.id === 'string') form.controls.id.setValue(patch.id, { emitEvent: false });
  if (typeof patch.name === 'string') form.controls.name.setValue(patch.name, { emitEvent: false });

  if (typeof patch.externalId === 'string') {
    form.controls.externalId.setValue(patch.externalId, { emitEvent: false });
  } else form.controls.externalId.setValue(null, { emitEvent: false });

  if (typeof patch.parentId === 'string') {
    form.controls.parentId.setValue(patch.parentId, { emitEvent: false });
  } else form.controls.parentId.setValue(null, { emitEvent: false });

  if (typeof patch.branchId === 'string') {
    form.controls.branchId.setValue(patch.branchId, { emitEvent: false });
  } else form.controls.branchId.setValue(null, { emitEvent: false });

  if (typeof patch.buildingId === 'string') {
    form.controls.buildingId.setValue(patch.buildingId, { emitEvent: false });
  } else form.controls.buildingId.setValue(null, { emitEvent: false });

  if (typeof patch.annualBudget === 'number' && Number.isFinite(patch.annualBudget)) {
    form.controls.annualBudget.setValue(patch.annualBudget, { emitEvent: false });
  }

  if (typeof patch.currency === 'string') {
    form.controls.currency.setValue(patch.currency, { emitEvent: false });
  }

  if (typeof patch.budgetThresholdAlert === 'number' && Number.isFinite(patch.budgetThresholdAlert)) {
    form.controls.budgetThresholdAlert.setValue(patch.budgetThresholdAlert, { emitEvent: false });
  }

  const ctons = patch.carbonBudgetTons;
  if (typeof ctons === 'number' && Number.isFinite(ctons)) {
    form.controls.carbonBudgetTons.setValue(ctons, { emitEvent: false });
  } else form.controls.carbonBudgetTons.setValue(null, { emitEvent: false });

  const csp = patch.carbonShadowPrice;
  if (typeof csp === 'number' && Number.isFinite(csp)) {
    form.controls.carbonShadowPrice.setValue(csp, { emitEvent: false });
  } else form.controls.carbonShadowPrice.setValue(null, { emitEvent: false });

  if (
    typeof patch.budgetSensitivityIndex === 'number' &&
    Number.isFinite(patch.budgetSensitivityIndex)
  ) {
    form.controls.budgetSensitivityIndex.setValue(patch.budgetSensitivityIndex, { emitEvent: false });
  }

  if (typeof patch.fiscalYear === 'number' && Number.isFinite(patch.fiscalYear)) {
    form.controls.fiscalYear.setValue(Math.trunc(patch.fiscalYear), { emitEvent: false });
  }

  const hc = patch.headcount;
  if (typeof hc === 'number' && Number.isFinite(hc)) {
    form.controls.headcount.setValue(Math.trunc(hc), { emitEvent: false });
  } else form.controls.headcount.setValue(null, { emitEvent: false });

  const fa = patch.floorAreaSqm;
  if (typeof fa === 'number' && Number.isFinite(fa)) {
    form.controls.floorAreaSqm.setValue(fa, { emitEvent: false });
  } else form.controls.floorAreaSqm.setValue(null, { emitEvent: false });

  if (typeof patch.productionUnitName === 'string') {
    form.controls.productionUnitName.setValue(patch.productionUnitName, { emitEvent: false });
  } else form.controls.productionUnitName.setValue(null, { emitEvent: false });

  const ti = patch.targetIntensity;
  if (typeof ti === 'number' && Number.isFinite(ti)) {
    form.controls.targetIntensity.setValue(ti, { emitEvent: false });
  } else form.controls.targetIntensity.setValue(null, { emitEvent: false });

  if (typeof patch.renewableEnergyTarget === 'number' && Number.isFinite(patch.renewableEnergyTarget)) {
    form.controls.renewableEnergyTarget.setValue(patch.renewableEnergyTarget, { emitEvent: false });
  }

  const am = CostAllocationMethodSchema.options as readonly string[];
  if (typeof patch.allocationMethod === 'string' && am.includes(patch.allocationMethod)) {
    form.controls.allocationMethod.setValue(patch.allocationMethod as CostAllocationMethod, {
      emitEvent: false
    });
  }

  if (typeof patch.percentage === 'number' && Number.isFinite(patch.percentage)) {
    form.controls.percentage.setValue(patch.percentage, { emitEvent: false });
  }

  if (typeof patch.isShared === 'boolean') {
    form.controls.isShared.setValue(patch.isShared, { emitEvent: false });
  }

  if (typeof patch.allocationLastReviewDate === 'string') {
    const d = parseIsoToDate(patch.allocationLastReviewDate);
    form.controls.allocationLastReviewDate.setValue(d, { emitEvent: false });
  } else {
    form.controls.allocationLastReviewDate.setValue(null, { emitEvent: false });
  }

  if (typeof patch.approvedBy === 'string') {
    form.controls.approvedBy.setValue(patch.approvedBy, { emitEvent: false });
  } else form.controls.approvedBy.setValue(null, { emitEvent: false });

  const typ = CostCenterTypeSchema.options as readonly string[];
  if (typeof patch.type === 'string' && typ.includes(patch.type)) {
    form.controls.type.setValue(patch.type as CostCenterType, { emitEvent: false });
  }

  const fm = CostCenterForecastModelSchema.options as readonly string[];
  if (typeof patch.forecastModel === 'string' && fm.includes(patch.forecastModel)) {
    form.controls.forecastModel.setValue(patch.forecastModel as CostCenterForecastModel, {
      emitEvent: false
    });
  }

  if (typeof patch.managerEmail === 'string') {
    form.controls.managerEmail.setValue(patch.managerEmail, { emitEvent: false });
  } else form.controls.managerEmail.setValue(null, { emitEvent: false });

  if (typeof patch.operatingHoursId === 'string') {
    form.controls.operatingHoursId.setValue(patch.operatingHoursId, { emitEvent: false });
  } else form.controls.operatingHoursId.setValue(null, { emitEvent: false });

  const st = LifecycleStatusSchema.options as readonly string[];
  if (typeof patch.status === 'string' && st.includes(patch.status)) {
    form.controls.status.setValue(patch.status as LifecycleStatus, { emitEvent: false });
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
