/**
 * Formulario declarativo de medidor · alineado con @sms/common MeterDTOSchema / MeterDTO.
 */

import type { ValidatorFn } from '@angular/forms';
import { Validators } from '@angular/forms';
import type { FormBuilder, FormControl, FormGroup } from '@angular/forms';

import type { MeterDTO } from '@sms/common';
import {
  MeterAccuracyClassSchema,
  MeterCommunicationStatusSchema,
  MeterOperationalStatusSchema,
  MeterProtocolSchema,
  MeterServiceTypeSchema,
  MeterTypeSchema,
  MeterUnitSchema,
  parseMeterDTO,
  type MeterAccuracyClass,
  type MeterCommunicationStatus,
  type MeterOperationalStatus,
  type MeterProtocol,
  type MeterServiceType,
  type MeterType,
  type MeterUnit
} from '@sms/common';

export type MeterFormValue = {
  id: string;
  orgId: string;
  regionId: string;
  branchId: string;
  buildingId: string;
  name: string;
  serialNumber: string;
  internalTag: string | null;
  meterType: MeterType;
  serviceType: MeterServiceType;
  unit: MeterUnit;
  accuracyClass: MeterAccuracyClass;
  multiplier: number;
  loggingIntervalMinutes: number;
  timeZone: string;
  isMain: boolean;
  isNetMetering: boolean;
  meterLevel: number;
  parentMeterId: string | null;
  assetId: string | null;
  status: MeterOperationalStatus;
  communicationStatus: MeterCommunicationStatus;
  lastCalibrationDate: Date | null;
  nextCalibrationDate: Date | null;
  monitorsPowerQuality: boolean;
  hasDataLogging: boolean;
  metrologicalSealNumber: string | null;
  protocol: MeterProtocol;
  physicalAddress: string | null;
  firmwareVersion: string | null;
  isVirtual: boolean;
  virtualFormula: string | null;
  tagsJson: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type MeterFormShape = { [K in keyof MeterFormValue]: FormControl<MeterFormValue[K]> };
export type MeterFormGroup = FormGroup<MeterFormShape>;

export type MeterFormFieldKind =
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

export const METER_FORM_ENUM_OPTIONS = Object.freeze({
  meterType: optionsOf(MeterTypeSchema.options as readonly MeterType[]),
  meterServiceType: optionsOf(MeterServiceTypeSchema.options as readonly MeterServiceType[]),
  meterUnit: optionsOf(MeterUnitSchema.options as readonly MeterUnit[]),
  meterAccuracyClass: optionsOf(MeterAccuracyClassSchema.options as readonly MeterAccuracyClass[]),
  meterOperationalStatus: optionsOf(
    MeterOperationalStatusSchema.options as readonly MeterOperationalStatus[]
  ),
  meterCommunicationStatus: optionsOf(
    MeterCommunicationStatusSchema.options as readonly MeterCommunicationStatus[]
  ),
  meterProtocol: optionsOf(MeterProtocolSchema.options as readonly MeterProtocol[])
});

export interface MeterFormFieldDef<K extends keyof MeterFormValue = keyof MeterFormValue> {
  readonly key: K;
  readonly label: string;
  readonly kind: MeterFormFieldKind;
  readonly mdCols: 4 | 6 | 8 | 12;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly readonly?: boolean;
  readonly enumKey?: keyof typeof METER_FORM_ENUM_OPTIONS;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}

export interface MeterFormTabDef {
  readonly id: string;
  readonly label: string;
  readonly headline?: string;
  readonly fields: ReadonlyArray<MeterFormFieldDef>;
}

export function meterFieldValidators(meta: MeterFormFieldDef): ValidatorFn[] {
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

export const METER_FORM_TABS: ReadonlyArray<MeterFormTabDef> = Object.freeze([
  {
    id: 'general',
    label: 'General',
    headline: 'Identidad y clasificación técnica',
    fields: [
      { key: 'id', label: 'Meter ID', kind: 'hidden', mdCols: 12, required: true },
      { key: 'orgId', label: 'Organization ID', kind: 'hidden', mdCols: 12, required: true },
      { key: 'regionId', label: 'Region ID', kind: 'hidden', mdCols: 12, required: true },
      { key: 'branchId', label: 'Branch ID', kind: 'hidden', mdCols: 12, required: true },
      { key: 'buildingId', label: 'Building ID', kind: 'hidden', mdCols: 12, required: true },
      { key: 'name', label: 'Nombre del medidor', kind: 'text', mdCols: 8, required: true },
      { key: 'serialNumber', label: 'Número de serie', kind: 'text', mdCols: 4, required: true },
      {
        key: 'internalTag',
        label: 'Etiqueta interna (legacy IoT name)',
        kind: 'text',
        mdCols: 4,
        placeholder: '(opcional)'
      },
      {
        key: 'meterType',
        label: 'Tipo de medidor',
        kind: 'select',
        mdCols: 4,
        enumKey: 'meterType',
        required: true
      },
      {
        key: 'serviceType',
        label: 'Tipo de servicio',
        kind: 'select',
        mdCols: 4,
        enumKey: 'meterServiceType',
        required: true
      },
      {
        key: 'unit',
        label: 'Unidad',
        kind: 'select',
        mdCols: 4,
        enumKey: 'meterUnit',
        required: true
      },
      {
        key: 'accuracyClass',
        label: 'Clase de exactitud',
        kind: 'select',
        mdCols: 4,
        enumKey: 'meterAccuracyClass',
        required: true
      },
      {
        key: 'status',
        label: 'Estado operativo',
        kind: 'select',
        mdCols: 6,
        enumKey: 'meterOperationalStatus',
        required: true
      }
    ]
  },
  {
    id: 'metering',
    label: 'Lectura',
    headline: 'Parámetros de registro y jerarquía metrológica',
    fields: [
      {
        key: 'multiplier',
        label: 'Factor multiplicador',
        kind: 'number',
        mdCols: 4,
        required: true,
        min: 1e-6,
        step: 0.000001
      },
      {
        key: 'loggingIntervalMinutes',
        label: 'Intervalo de registro (minutos)',
        kind: 'integer',
        mdCols: 4,
        required: true,
        min: 1,
        step: 1
      },
      { key: 'timeZone', label: 'Zona horaria (IANA o etiqueta)', kind: 'text', mdCols: 4, required: true },
      {
        key: 'meterLevel',
        label: 'Nivel jerárquico del medidor (1–99)',
        kind: 'integer',
        mdCols: 4,
        required: true,
        min: 1,
        max: 99,
        step: 1
      },
      { key: 'isMain', label: 'Medidor principal (isMain)', kind: 'checkbox', mdCols: 6 },
      { key: 'isNetMetering', label: 'Net metering (isNetMetering)', kind: 'checkbox', mdCols: 6 }
    ]
  },
  {
    id: 'links',
    label: 'Vínculos',
    headline: 'Padre en red y activo asociado',
    fields: [
      {
        key: 'parentMeterId',
        label: 'parentMeterId',
        kind: 'text',
        mdCols: 6,
        placeholder: '(opcional)'
      },
      {
        key: 'assetId',
        label: 'assetId',
        kind: 'text',
        mdCols: 6,
        placeholder: '(opcional)'
      }
    ]
  },
  {
    id: 'telemetry',
    label: 'Telemetría',
    headline: 'Protocolo, conectividad y calidad de datos',
    fields: [
      {
        key: 'protocol',
        label: 'Protocolo',
        kind: 'select',
        mdCols: 4,
        enumKey: 'meterProtocol',
        required: true
      },
      {
        key: 'communicationStatus',
        label: 'Estado de comunicación',
        kind: 'select',
        mdCols: 4,
        enumKey: 'meterCommunicationStatus',
        required: true
      },
      {
        key: 'physicalAddress',
        label: 'Dirección física / bus',
        kind: 'text',
        mdCols: 6,
        placeholder: '(opcional)'
      },
      {
        key: 'firmwareVersion',
        label: 'Versión de firmware',
        kind: 'text',
        mdCols: 6,
        placeholder: '(opcional)'
      },
      { key: 'monitorsPowerQuality', label: 'Monitorea calidad de potencia', kind: 'checkbox', mdCols: 6 },
      { key: 'hasDataLogging', label: 'Tiene data logging local', kind: 'checkbox', mdCols: 6 }
    ]
  },
  {
    id: 'calibration',
    label: 'Calibración',
    headline: 'Sellado metrológico y vigencia',
    fields: [
      {
        key: 'metrologicalSealNumber',
        label: 'Número de sello metrológico',
        kind: 'text',
        mdCols: 6,
        placeholder: '(opcional)'
      },
      {
        key: 'lastCalibrationDate',
        label: 'Última calibración',
        kind: 'date',
        mdCols: 6,
        placeholder: '(opcional)'
      },
      {
        key: 'nextCalibrationDate',
        label: 'Próxima calibración',
        kind: 'date',
        mdCols: 6,
        placeholder: '(opcional)'
      }
    ]
  },
  {
    id: 'virtual_audit',
    label: 'Virtual · auditoría',
    headline: 'Fórmula virtual, etiquetas y marcas de tiempo',
    fields: [
      { key: 'isVirtual', label: 'Medidor virtual', kind: 'checkbox', mdCols: 6 },
      {
        key: 'virtualFormula',
        label: 'Fórmula virtual',
        kind: 'textarea',
        mdCols: 12,
        placeholder: '(opcional)'
      },
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

export const METER_FIELD_GRID_CLASS: Record<MeterFormFieldDef['mdCols'], string> = {
  4: 'col-span-12 md:col-span-4',
  6: 'col-span-12 md:col-span-6',
  8: 'col-span-12 md:col-span-8',
  12: 'col-span-12'
};

function allFieldDefs(): ReadonlyArray<MeterFormFieldDef> {
  return METER_FORM_TABS.flatMap((t) => t.fields);
}

export const METER_FORM_DEFAULT_VALUE: MeterFormValue = {
  id: '',
  orgId: '',
  regionId: '',
  branchId: '',
  buildingId: '',
  name: '',
  serialNumber: '',
  internalTag: null,
  meterType: (MeterTypeSchema.options[0] ?? 'ELECTRICITY') as MeterType,
  serviceType: (MeterServiceTypeSchema.options[0] ?? 'SUBMETERING') as MeterServiceType,
  unit: (MeterUnitSchema.options[0] ?? 'KWH') as MeterUnit,
  accuracyClass: (MeterAccuracyClassSchema.options[0] ?? '1.0') as MeterAccuracyClass,
  multiplier: 1,
  loggingIntervalMinutes: 15,
  timeZone: 'UTC',
  isMain: false,
  isNetMetering: false,
  meterLevel: 2,
  parentMeterId: null,
  assetId: null,
  status: (MeterOperationalStatusSchema.options[0] ?? 'ACTIVE') as MeterOperationalStatus,
  communicationStatus: (MeterCommunicationStatusSchema.options[0] ?? 'ONLINE') as MeterCommunicationStatus,
  lastCalibrationDate: null,
  nextCalibrationDate: null,
  monitorsPowerQuality: false,
  hasDataLogging: false,
  metrologicalSealNumber: null,
  protocol: (MeterProtocolSchema.options[0] ?? 'MQTT') as MeterProtocol,
  physicalAddress: null,
  firmwareVersion: null,
  isVirtual: false,
  virtualFormula: null,
  tagsJson: '{}',
  createdAt: null,
  updatedAt: null
};

const NULLABLE_FIELDS = new Set<keyof MeterFormValue>([
  'internalTag',
  'parentMeterId',
  'assetId',
  'lastCalibrationDate',
  'nextCalibrationDate',
  'metrologicalSealNumber',
  'physicalAddress',
  'firmwareVersion',
  'virtualFormula',
  'createdAt',
  'updatedAt'
]);

export function buildMeterFormGroup(fb: FormBuilder): MeterFormGroup {
  const defaults = METER_FORM_DEFAULT_VALUE;
  const fbnn = fb.nonNullable;
  const controls = {} as Record<keyof MeterFormValue, FormControl | unknown>;

  for (const meta of allFieldDefs()) {
    const key = meta.key;
    const initial = defaults[key];
    const validators = meterFieldValidators(meta);
    if (NULLABLE_FIELDS.has(key)) {
      controls[key] = fb.control(initial as never, validators);
      continue;
    }
    controls[key] = fbnn.control(initial as never, validators);
  }

  return fb.group(controls as never) as unknown as MeterFormGroup;
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

export function meterFormRawValueToDTO(v: MeterFormValue): MeterDTO {
  const input: Record<string, unknown> = {
    id: v.id.trim(),
    orgId: v.orgId.trim(),
    regionId: v.regionId.trim(),
    branchId: v.branchId.trim(),
    buildingId: v.buildingId.trim(),
    name: v.name.trim(),
    serialNumber: v.serialNumber.trim(),
    meterType: v.meterType,
    serviceType: v.serviceType,
    unit: v.unit,
    accuracyClass: v.accuracyClass,
    multiplier: v.multiplier,
    loggingIntervalMinutes: v.loggingIntervalMinutes,
    timeZone: v.timeZone.trim(),
    isMain: v.isMain,
    isNetMetering: v.isNetMetering,
    meterLevel: v.meterLevel,
    status: v.status,
    communicationStatus: v.communicationStatus,
    monitorsPowerQuality: v.monitorsPowerQuality,
    hasDataLogging: v.hasDataLogging,
    protocol: v.protocol,
    isVirtual: v.isVirtual,
    tags: parseTagsJson(v.tagsJson)
  };

  const it = v.internalTag?.trim();
  if (it) input['internalTag'] = it;

  const pm = v.parentMeterId?.trim();
  if (pm) input['parentMeterId'] = pm;

  const aid = v.assetId?.trim();
  if (aid) input['assetId'] = aid;

  const lcal = optionalIso(v.lastCalibrationDate);
  if (lcal) input['lastCalibrationDate'] = lcal;

  const ncal = optionalIso(v.nextCalibrationDate);
  if (ncal) input['nextCalibrationDate'] = ncal;

  const seal = v.metrologicalSealNumber?.trim();
  if (seal) input['metrologicalSealNumber'] = seal;

  const pa = v.physicalAddress?.trim();
  if (pa) input['physicalAddress'] = pa;

  const fw = v.firmwareVersion?.trim();
  if (fw) input['firmwareVersion'] = fw;

  const vf = v.virtualFormula?.trim();
  if (vf) input['virtualFormula'] = vf;

  const ca = v.createdAt?.trim();
  if (ca) input['createdAt'] = ca;

  const ua = v.updatedAt?.trim();
  if (ua) input['updatedAt'] = ua;

  return parseMeterDTO(input);
}

/** Metadatos de nodo + claves legacy (`organizationId`, `iotName`). */
export type MeterHydrationPatch = Partial<MeterDTO> & { organizationId?: string; iotName?: string };

export function hydrateMeterFormFromPartial(
  form: MeterFormGroup,
  patch: MeterHydrationPatch,
  fallbackOrgId: string,
  fallbackRegionId: string,
  fallbackBranchId: string,
  fallbackBuildingId: string,
  fallbackMeterId: string
): void {
  const orgId =
    (typeof patch.orgId === 'string' && patch.orgId) ||
    (typeof patch.organizationId === 'string' && patch.organizationId) ||
    fallbackOrgId;
  form.controls.orgId.patchValue(orgId, { emitEvent: false });
  form.controls.regionId.patchValue(patch.regionId ?? fallbackRegionId, { emitEvent: false });
  form.controls.branchId.patchValue(patch.branchId ?? fallbackBranchId, { emitEvent: false });
  form.controls.buildingId.patchValue(patch.buildingId ?? fallbackBuildingId, { emitEvent: false });
  form.controls.id.patchValue(
    patch.id && typeof patch.id === 'string' ? patch.id : fallbackMeterId,
    { emitEvent: false }
  );

  if (typeof patch.name === 'string') form.controls.name.setValue(patch.name, { emitEvent: false });
  if (typeof patch.serialNumber === 'string') {
    form.controls.serialNumber.setValue(patch.serialNumber, { emitEvent: false });
  }

  if (typeof patch.internalTag === 'string') {
    form.controls.internalTag.setValue(patch.internalTag, { emitEvent: false });
  } else if (typeof patch.iotName === 'string') {
    form.controls.internalTag.setValue(patch.iotName, { emitEvent: false });
  } else {
    form.controls.internalTag.setValue(null, { emitEvent: false });
  }

  const mts = MeterTypeSchema.options as readonly string[];
  if (typeof patch.meterType === 'string' && mts.includes(patch.meterType)) {
    form.controls.meterType.setValue(patch.meterType as MeterType, { emitEvent: false });
  }

  const svc = MeterServiceTypeSchema.options as readonly string[];
  if (typeof patch.serviceType === 'string' && svc.includes(patch.serviceType)) {
    form.controls.serviceType.setValue(patch.serviceType as MeterServiceType, { emitEvent: false });
  }

  const un = MeterUnitSchema.options as readonly string[];
  if (typeof patch.unit === 'string' && un.includes(patch.unit)) {
    form.controls.unit.setValue(patch.unit as MeterUnit, { emitEvent: false });
  }

  const ac = MeterAccuracyClassSchema.options as readonly string[];
  if (typeof patch.accuracyClass === 'string' && ac.includes(patch.accuracyClass)) {
    form.controls.accuracyClass.setValue(patch.accuracyClass as MeterAccuracyClass, { emitEvent: false });
  }

  if (typeof patch.multiplier === 'number' && Number.isFinite(patch.multiplier)) {
    form.controls.multiplier.setValue(patch.multiplier, { emitEvent: false });
  }
  if (typeof patch.loggingIntervalMinutes === 'number' && Number.isFinite(patch.loggingIntervalMinutes)) {
    form.controls.loggingIntervalMinutes.setValue(Math.trunc(patch.loggingIntervalMinutes), {
      emitEvent: false
    });
  }
  if (typeof patch.timeZone === 'string') {
    form.controls.timeZone.setValue(patch.timeZone, { emitEvent: false });
  }

  if (typeof patch.isMain === 'boolean') {
    form.controls.isMain.setValue(patch.isMain, { emitEvent: false });
  }
  if (typeof patch.isNetMetering === 'boolean') {
    form.controls.isNetMetering.setValue(patch.isNetMetering, { emitEvent: false });
  }
  if (typeof patch.meterLevel === 'number' && Number.isFinite(patch.meterLevel)) {
    form.controls.meterLevel.setValue(Math.trunc(patch.meterLevel), { emitEvent: false });
  }

  if (typeof patch.parentMeterId === 'string') {
    form.controls.parentMeterId.setValue(patch.parentMeterId, { emitEvent: false });
  } else form.controls.parentMeterId.setValue(null, { emitEvent: false });

  if (typeof patch.assetId === 'string') {
    form.controls.assetId.setValue(patch.assetId, { emitEvent: false });
  } else form.controls.assetId.setValue(null, { emitEvent: false });

  const st = MeterOperationalStatusSchema.options as readonly string[];
  if (typeof patch.status === 'string' && st.includes(patch.status)) {
    form.controls.status.setValue(patch.status as MeterOperationalStatus, { emitEvent: false });
  }

  const cs = MeterCommunicationStatusSchema.options as readonly string[];
  if (typeof patch.communicationStatus === 'string' && cs.includes(patch.communicationStatus)) {
    form.controls.communicationStatus.setValue(patch.communicationStatus as MeterCommunicationStatus, {
      emitEvent: false
    });
  }

  if (typeof patch.lastCalibrationDate === 'string') {
    form.controls.lastCalibrationDate.setValue(parseIsoToDate(patch.lastCalibrationDate), {
      emitEvent: false
    });
  } else form.controls.lastCalibrationDate.setValue(null, { emitEvent: false });

  if (typeof patch.nextCalibrationDate === 'string') {
    form.controls.nextCalibrationDate.setValue(parseIsoToDate(patch.nextCalibrationDate), {
      emitEvent: false
    });
  } else form.controls.nextCalibrationDate.setValue(null, { emitEvent: false });

  if (typeof patch.monitorsPowerQuality === 'boolean') {
    form.controls.monitorsPowerQuality.setValue(patch.monitorsPowerQuality, { emitEvent: false });
  }
  if (typeof patch.hasDataLogging === 'boolean') {
    form.controls.hasDataLogging.setValue(patch.hasDataLogging, { emitEvent: false });
  }

  if (typeof patch.metrologicalSealNumber === 'string') {
    form.controls.metrologicalSealNumber.setValue(patch.metrologicalSealNumber, { emitEvent: false });
  } else form.controls.metrologicalSealNumber.setValue(null, { emitEvent: false });

  const pr = MeterProtocolSchema.options as readonly string[];
  if (typeof patch.protocol === 'string' && pr.includes(patch.protocol)) {
    form.controls.protocol.setValue(patch.protocol as MeterProtocol, { emitEvent: false });
  }

  if (typeof patch.physicalAddress === 'string') {
    form.controls.physicalAddress.setValue(patch.physicalAddress, { emitEvent: false });
  } else form.controls.physicalAddress.setValue(null, { emitEvent: false });

  if (typeof patch.firmwareVersion === 'string') {
    form.controls.firmwareVersion.setValue(patch.firmwareVersion, { emitEvent: false });
  } else form.controls.firmwareVersion.setValue(null, { emitEvent: false });

  if (typeof patch.isVirtual === 'boolean') {
    form.controls.isVirtual.setValue(patch.isVirtual, { emitEvent: false });
  }

  if (typeof patch.virtualFormula === 'string') {
    form.controls.virtualFormula.setValue(patch.virtualFormula, { emitEvent: false });
  } else form.controls.virtualFormula.setValue(null, { emitEvent: false });

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
