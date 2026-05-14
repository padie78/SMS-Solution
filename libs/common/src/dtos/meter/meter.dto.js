import { z } from 'zod';
import { SmsIdSchema } from '../../schemas/sms-id.schema.js';
import { MeterTypeSchema } from '../shared/domain-enums.js';
import { MeterOperationalStatusSchema, MeterProtocolSchema } from '../shared/graphql-setup-enums.js';
export const MeterServiceTypeSchema = z.enum(['UTILITY', 'SUBMETERING', 'GENERATION']);
export const MeterUnitSchema = z.enum(['KWH', 'M3', 'GJ', 'L', 'BTU']);
export const MeterAccuracyClassSchema = z.enum(['0.2S', '0.5S', '1.0', '2.0']);
export const MeterCommunicationStatusSchema = z.enum(['ONLINE', 'OFFLINE', 'DEGRADED']);
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
    id;
    orgId;
    regionId;
    branchId;
    buildingId;
    name;
    serialNumber;
    internalTag;
    meterType;
    serviceType;
    unit;
    accuracyClass;
    multiplier;
    loggingIntervalMinutes;
    timeZone;
    isMain;
    isNetMetering;
    meterLevel;
    parentMeterId;
    assetId;
    status;
    communicationStatus;
    lastCalibrationDate;
    nextCalibrationDate;
    monitorsPowerQuality;
    hasDataLogging;
    metrologicalSealNumber;
    protocol;
    physicalAddress;
    firmwareVersion;
    isVirtual;
    virtualFormula;
    tags;
    createdAt;
    updatedAt;
    constructor(id, orgId, regionId, branchId, buildingId, name, serialNumber, internalTag, meterType, serviceType, unit, accuracyClass, multiplier, loggingIntervalMinutes, timeZone, isMain, isNetMetering, meterLevel, parentMeterId, assetId, status, communicationStatus, lastCalibrationDate, nextCalibrationDate, monitorsPowerQuality, hasDataLogging, metrologicalSealNumber, protocol, physicalAddress, firmwareVersion, isVirtual, virtualFormula, tags, createdAt, updatedAt) {
        this.id = id;
        this.orgId = orgId;
        this.regionId = regionId;
        this.branchId = branchId;
        this.buildingId = buildingId;
        this.name = name;
        this.serialNumber = serialNumber;
        if (internalTag?.trim())
            this.internalTag = internalTag.trim();
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
        if (parentMeterId?.trim())
            this.parentMeterId = parentMeterId.trim();
        if (assetId?.trim())
            this.assetId = assetId.trim();
        this.status = status;
        this.communicationStatus = communicationStatus ?? 'ONLINE';
        if (lastCalibrationDate?.trim())
            this.lastCalibrationDate = lastCalibrationDate.trim();
        if (nextCalibrationDate?.trim())
            this.nextCalibrationDate = nextCalibrationDate.trim();
        this.monitorsPowerQuality = monitorsPowerQuality ?? false;
        this.hasDataLogging = hasDataLogging ?? false;
        if (metrologicalSealNumber?.trim())
            this.metrologicalSealNumber = metrologicalSealNumber.trim();
        this.protocol = protocol;
        if (physicalAddress?.trim())
            this.physicalAddress = physicalAddress.trim();
        if (firmwareVersion?.trim())
            this.firmwareVersion = firmwareVersion.trim();
        this.isVirtual = isVirtual ?? false;
        if (virtualFormula?.trim())
            this.virtualFormula = virtualFormula.trim();
        this.tags = typeof tags === 'object' && tags !== null ? { ...tags } : {};
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
export const parseMeterDTO = (input) => {
    const d = MeterDTOSchema.parse(input);
    return new MeterDTO(d.id, d.orgId, d.regionId, d.branchId, d.buildingId, d.name, d.serialNumber, d.internalTag, d.meterType, d.serviceType, d.unit, d.accuracyClass, d.multiplier, d.loggingIntervalMinutes, d.timeZone, d.isMain, d.isNetMetering, d.meterLevel, d.parentMeterId, d.assetId, d.status, d.communicationStatus, d.lastCalibrationDate, d.nextCalibrationDate, d.monitorsPowerQuality, d.hasDataLogging, d.metrologicalSealNumber, d.protocol, d.physicalAddress, d.firmwareVersion, d.isVirtual, d.virtualFormula, d.tags, d.createdAt, d.updatedAt);
};
export const safeParseMeterDTO = (input) => MeterDTOSchema.safeParse(input);
//# sourceMappingURL=meter.dto.js.map