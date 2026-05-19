import { z } from 'zod';
import { SmsIdSchema } from '../../validation/schemas/sms-id.schema.js';
import { MeterTypeSchema } from '../shared/domain-enums.js';
import { MeterOperationalStatusSchema, MeterProtocolSchema } from '../shared/graphql-setup-enums.js';

export const MeterServiceTypeSchema = z.enum(['UTILITY', 'SUBMETERING', 'GENERATION']);

export const MeterUnitSchema = z.enum(['KWH', 'M3', 'GJ', 'L', 'BTU']);

export const MeterAccuracyClassSchema = z.enum(['0.2S', '0.5S', '1.0', '2.0']);

export const MeterCommunicationStatusSchema = z.enum(['ONLINE', 'OFFLINE', 'DEGRADED']);

export type MeterServiceType = z.infer<typeof MeterServiceTypeSchema>;
export type MeterUnit = z.infer<typeof MeterUnitSchema>;
export type MeterAccuracyClass = z.infer<typeof MeterAccuracyClassSchema>;
export type MeterCommunicationStatus = z.infer<typeof MeterCommunicationStatusSchema>;

const tagsSchema = z.record(z.string(), z.string()).default({});

export const MeterDTOSchema = z.object({
  id: SmsIdSchema,
  orgId: SmsIdSchema,
  regionId: SmsIdSchema,
  branchId: SmsIdSchema,
  buildingId: SmsIdSchema,
  name: z.string().min(1),
  serialNumber: z.string().min(1),
  internalTag: z.string().min(1).optional(),

  meterType: MeterTypeSchema,
  serviceType: MeterServiceTypeSchema.default('SUBMETERING'),
  unit: MeterUnitSchema.default('KWH'),
  accuracyClass: MeterAccuracyClassSchema.default('1.0'),
  multiplier: z.number().positive().default(1),
  loggingIntervalMinutes: z.number().int().positive().default(15),
  timeZone: z.string().min(1).default('UTC'),

  isMain: z.boolean().default(false),
  isNetMetering: z.boolean().default(false),
  meterLevel: z.number().int().min(1).max(99),
  parentMeterId: SmsIdSchema.optional(),
  assetId: SmsIdSchema.optional(),

  status: MeterOperationalStatusSchema,
  communicationStatus: MeterCommunicationStatusSchema.default('ONLINE'),
  lastCalibrationDate: z.string().min(4).max(40).optional(),
  nextCalibrationDate: z.string().min(4).max(40).optional(),
  monitorsPowerQuality: z.boolean().default(false),
  hasDataLogging: z.boolean().default(false),
  metrologicalSealNumber: z.string().min(1).optional(),

  protocol: MeterProtocolSchema,
  physicalAddress: z.string().min(1).optional(),
  firmwareVersion: z.string().min(1).optional(),

  isVirtual: z.boolean().default(false),
  virtualFormula: z.string().min(1).optional(),

  tags: tagsSchema,
  createdAt: z.string().min(1).optional(),
  updatedAt: z.string().min(1).optional()
});

export class MeterDTO {
  public readonly id: string;
  public readonly orgId: string;
  public readonly regionId: string;
  public readonly branchId: string;
  public readonly buildingId: string;
  public readonly name: string;
  public readonly serialNumber: string;
  public readonly internalTag?: string;
  public readonly meterType: z.infer<typeof MeterTypeSchema>;
  public readonly serviceType: z.infer<typeof MeterServiceTypeSchema>;
  public readonly unit: z.infer<typeof MeterUnitSchema>;
  public readonly accuracyClass: z.infer<typeof MeterAccuracyClassSchema>;
  public readonly multiplier: number;
  public readonly loggingIntervalMinutes: number;
  public readonly timeZone: string;
  public readonly isMain: boolean;
  public readonly isNetMetering: boolean;
  public readonly meterLevel: number;
  public readonly parentMeterId?: string;
  public readonly assetId?: string;
  public readonly status: z.infer<typeof MeterOperationalStatusSchema>;
  public readonly communicationStatus: z.infer<typeof MeterCommunicationStatusSchema>;
  public readonly lastCalibrationDate?: string;
  public readonly nextCalibrationDate?: string;
  public readonly monitorsPowerQuality: boolean;
  public readonly hasDataLogging: boolean;
  public readonly metrologicalSealNumber?: string;
  public readonly protocol: z.infer<typeof MeterProtocolSchema>;
  public readonly physicalAddress?: string;
  public readonly firmwareVersion?: string;
  public readonly isVirtual: boolean;
  public readonly virtualFormula?: string;
  public readonly tags: Record<string, string>;
  public readonly createdAt?: string;
  public readonly updatedAt?: string;

  constructor(
    id: string,
    orgId: string,
    regionId: string,
    branchId: string,
    buildingId: string,
    name: string,
    serialNumber: string,
    internalTag: string | null | undefined,
    meterType: z.infer<typeof MeterTypeSchema>,
    serviceType: z.infer<typeof MeterServiceTypeSchema> | null | undefined,
    unit: z.infer<typeof MeterUnitSchema> | null | undefined,
    accuracyClass: z.infer<typeof MeterAccuracyClassSchema> | null | undefined,
    multiplier: number | null | undefined,
    loggingIntervalMinutes: number | null | undefined,
    timeZone: string | null | undefined,
    isMain: boolean | null | undefined,
    isNetMetering: boolean | null | undefined,
    meterLevel: number,
    parentMeterId: string | null | undefined,
    assetId: string | null | undefined,
    status: z.infer<typeof MeterOperationalStatusSchema>,
    communicationStatus: z.infer<typeof MeterCommunicationStatusSchema> | null | undefined,
    lastCalibrationDate: string | null | undefined,
    nextCalibrationDate: string | null | undefined,
    monitorsPowerQuality: boolean | null | undefined,
    hasDataLogging: boolean | null | undefined,
    metrologicalSealNumber: string | null | undefined,
    protocol: z.infer<typeof MeterProtocolSchema>,
    physicalAddress: string | null | undefined,
    firmwareVersion: string | null | undefined,
    isVirtual: boolean | null | undefined,
    virtualFormula: string | null | undefined,
    tags: Record<string, string> | null | undefined,
    createdAt?: string,
    updatedAt?: string
  ) {
    this.id = id;
    this.orgId = orgId;
    this.regionId = regionId;
    this.branchId = branchId;
    this.buildingId = buildingId;
    this.name = name;
    this.serialNumber = serialNumber;
    if (internalTag?.trim()) this.internalTag = internalTag.trim();
    this.meterType = meterType;
    this.serviceType = serviceType ?? 'SUBMETERING';
    this.unit = unit ?? 'KWH';
    this.accuracyClass = accuracyClass ?? '1.0';
    this.multiplier = multiplier ?? 1;
    this.loggingIntervalMinutes = loggingIntervalMinutes ?? 15;
    this.timeZone = timeZone?.trim() ? timeZone.trim() : 'UTC';
    this.isMain = isMain ?? false;
    this.isNetMetering = isNetMetering ?? false;
    this.meterLevel = meterLevel;
    if (parentMeterId?.trim()) this.parentMeterId = parentMeterId.trim();
    if (assetId?.trim()) this.assetId = assetId.trim();
    this.status = status;
    this.communicationStatus = communicationStatus ?? 'ONLINE';
    if (lastCalibrationDate?.trim()) this.lastCalibrationDate = lastCalibrationDate.trim();
    if (nextCalibrationDate?.trim()) this.nextCalibrationDate = nextCalibrationDate.trim();
    this.monitorsPowerQuality = monitorsPowerQuality ?? false;
    this.hasDataLogging = hasDataLogging ?? false;
    if (metrologicalSealNumber?.trim()) this.metrologicalSealNumber = metrologicalSealNumber.trim();
    this.protocol = protocol;
    if (physicalAddress?.trim()) this.physicalAddress = physicalAddress.trim();
    if (firmwareVersion?.trim()) this.firmwareVersion = firmwareVersion.trim();
    this.isVirtual = isVirtual ?? false;
    if (virtualFormula?.trim()) this.virtualFormula = virtualFormula.trim();
    this.tags = typeof tags === 'object' && tags !== null ? { ...tags } : {};
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

export type MeterDTOInput = z.infer<typeof MeterDTOSchema>;

export const parseMeterDTO = (input: unknown): MeterDTO => {
  const d = MeterDTOSchema.parse(input);
  return new MeterDTO(
    d.id,
    d.orgId,
    d.regionId,
    d.branchId,
    d.buildingId,
    d.name,
    d.serialNumber,
    d.internalTag,
    d.meterType,
    d.serviceType,
    d.unit,
    d.accuracyClass,
    d.multiplier,
    d.loggingIntervalMinutes,
    d.timeZone,
    d.isMain,
    d.isNetMetering,
    d.meterLevel,
    d.parentMeterId,
    d.assetId,
    d.status,
    d.communicationStatus,
    d.lastCalibrationDate,
    d.nextCalibrationDate,
    d.monitorsPowerQuality,
    d.hasDataLogging,
    d.metrologicalSealNumber,
    d.protocol,
    d.physicalAddress,
    d.firmwareVersion,
    d.isVirtual,
    d.virtualFormula,
    d.tags,
    d.createdAt,
    d.updatedAt
  );
};

export const safeParseMeterDTO = (input: unknown) => MeterDTOSchema.safeParse(input);
