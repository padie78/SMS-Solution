import { z } from 'zod';
import { SmsIdSchema } from '../../schemas/sms-id.schema.js';
import { AssetTypeSchema } from '../common/domain-enums.js';
import { AssetLifecycleStatusSchema } from '../common/graphql-setup-enums.js';
export const AssetCriticalitySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'MISSION_CRITICAL']);
export const AssetEnergySourceSchema = z.enum([
    'ELECTRICITY',
    'NATURAL_GAS',
    'DIESEL',
    'BIOMASS',
    'STEAM',
    'HYDROGEN'
]);
export const AssetGhgScopeSchema = z.enum(['SCOPE_1', 'SCOPE_2', 'SCOPE_3']);
export const AssetEmissionSourceCategorySchema = z.enum([
    'STATIONARY_COMBUSTION',
    'FUGITIVE_EMISSIONS',
    'PROCESS_EMISSIONS'
]);
export const AssetConditionIndexSchema = z.enum(['NEW', 'GOOD', 'FAIR', 'POOR']);
export const AssetRedundancyLevelSchema = z.enum(['N', 'N+1', '2N']);
const tagsSchema = z.record(z.string(), z.string()).default({});
/** ISO fecha (YYYY-MM-DD o texto ISO); validación laxa Enterprise. */
const isoLikeDateSchema = z.string().min(4).max(32);
export const AssetDTOSchema = z.object({
    id: SmsIdSchema,
    organizationId: SmsIdSchema,
    regionId: SmsIdSchema,
    branchId: SmsIdSchema,
    buildingId: SmsIdSchema,
    /** Mock UI: permite vacío y se sustituye por placeholder estable. */
    costCenterId: z.preprocess((v) => (typeof v === 'string' && v.trim() !== '' ? v : 'cc-unassigned'), SmsIdSchema),
    name: z.string().min(1),
    assetTag: z.string().min(1).optional(),
    barcode: z.string().min(1).optional(),
    type: AssetTypeSchema,
    status: AssetLifecycleStatusSchema,
    criticality: AssetCriticalitySchema.default('MEDIUM'),
    manufacturer: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    serialNumber: z.string().min(1).optional(),
    installationDate: isoLikeDateSchema,
    usefulLifeYears: z.number().int().positive(),
    decommissionDate: isoLikeDateSchema.optional(),
    isSignificantEnergyUse: z.boolean().default(false),
    nominalPowerKw: z.number().nonnegative(),
    standbyPowerKw: z.number().nonnegative().optional(),
    energySource: AssetEnergySourceSchema,
    nominalEfficiency: z.number().nonnegative(),
    dutyCycleExpected: z.number().min(0).max(1).default(0.8),
    powerFactorTarget: z.number().min(0).max(1).default(0.95),
    ghgScope: AssetGhgScopeSchema,
    emissionSourceCategory: AssetEmissionSourceCategorySchema,
    fuelType: z.string().min(1).optional(),
    biogenicFraction: z.number().min(0).max(1).default(0),
    refrigerantGasType: z.string().min(1).optional(),
    refrigerantChargeKg: z.number().nonnegative().optional(),
    refrigerantGWP: z.number().nonnegative().optional(),
    annualLeakageRateExpected: z.number().min(0).max(1).default(0.05),
    meterId: SmsIdSchema.optional(),
    cloudDeviceId: z.string().min(1).optional(),
    telemetryTopic: z.string().min(1).optional(),
    isVirtualAsset: z.boolean().default(false),
    dataQualityScore: z.number().min(0).max(1).default(1),
    lastMaintenanceDate: isoLikeDateSchema.optional(),
    nextMaintenanceDate: isoLikeDateSchema.optional(),
    maintenanceVendor: z.string().min(1).optional(),
    conditionIndex: AssetConditionIndexSchema,
    efficiencyDegradationFactor: z.number().min(0).max(1).default(0.02),
    redundancyLevel: AssetRedundancyLevelSchema.default('N'),
    mtbfHours: z.number().positive().optional(),
    tags: tagsSchema,
    createdAt: z.string().min(1).optional(),
    updatedAt: z.string().min(1).optional()
});
export class AssetDTO {
    id;
    organizationId;
    regionId;
    branchId;
    buildingId;
    costCenterId;
    name;
    assetTag;
    barcode;
    type;
    status;
    criticality;
    manufacturer;
    model;
    serialNumber;
    installationDate;
    usefulLifeYears;
    decommissionDate;
    isSignificantEnergyUse;
    nominalPowerKw;
    standbyPowerKw;
    energySource;
    nominalEfficiency;
    dutyCycleExpected;
    powerFactorTarget;
    ghgScope;
    emissionSourceCategory;
    fuelType;
    biogenicFraction;
    refrigerantGasType;
    refrigerantChargeKg;
    refrigerantGWP;
    annualLeakageRateExpected;
    meterId;
    cloudDeviceId;
    telemetryTopic;
    isVirtualAsset;
    dataQualityScore;
    lastMaintenanceDate;
    nextMaintenanceDate;
    maintenanceVendor;
    conditionIndex;
    efficiencyDegradationFactor;
    redundancyLevel;
    mtbfHours;
    tags;
    createdAt;
    updatedAt;
    constructor(id, organizationId, regionId, branchId, buildingId, costCenterId, name, assetTag, barcode, type, status, criticality, manufacturer, model, serialNumber, installationDate, usefulLifeYears, decommissionDate, isSignificantEnergyUse, nominalPowerKw, standbyPowerKw, energySource, nominalEfficiency, dutyCycleExpected, powerFactorTarget, ghgScope, emissionSourceCategory, fuelType, biogenicFraction, refrigerantGasType, refrigerantChargeKg, refrigerantGWP, annualLeakageRateExpected, meterId, cloudDeviceId, telemetryTopic, isVirtualAsset, dataQualityScore, lastMaintenanceDate, nextMaintenanceDate, maintenanceVendor, conditionIndex, efficiencyDegradationFactor, redundancyLevel, mtbfHours, tags, createdAt, updatedAt) {
        this.id = id;
        this.organizationId = organizationId;
        this.regionId = regionId;
        this.branchId = branchId;
        this.buildingId = buildingId;
        const cc = typeof costCenterId === 'string' && costCenterId.trim() !== '' ? costCenterId.trim() : 'cc-unassigned';
        this.costCenterId = cc;
        this.name = name;
        if (assetTag?.trim())
            this.assetTag = assetTag.trim();
        if (barcode?.trim())
            this.barcode = barcode.trim();
        this.type = type;
        this.status = status;
        this.criticality = criticality ?? 'MEDIUM';
        if (manufacturer?.trim())
            this.manufacturer = manufacturer.trim();
        if (model?.trim())
            this.model = model.trim();
        if (serialNumber?.trim())
            this.serialNumber = serialNumber.trim();
        this.installationDate = installationDate;
        this.usefulLifeYears = usefulLifeYears;
        if (decommissionDate?.trim())
            this.decommissionDate = decommissionDate.trim();
        this.isSignificantEnergyUse = isSignificantEnergyUse ?? false;
        this.nominalPowerKw = nominalPowerKw;
        if (standbyPowerKw !== null && standbyPowerKw !== undefined)
            this.standbyPowerKw = standbyPowerKw;
        this.energySource = energySource;
        this.nominalEfficiency = nominalEfficiency;
        this.dutyCycleExpected = dutyCycleExpected ?? 0.8;
        this.powerFactorTarget = powerFactorTarget ?? 0.95;
        this.ghgScope = ghgScope;
        this.emissionSourceCategory = emissionSourceCategory;
        if (fuelType?.trim())
            this.fuelType = fuelType.trim();
        this.biogenicFraction = biogenicFraction ?? 0;
        if (refrigerantGasType?.trim())
            this.refrigerantGasType = refrigerantGasType.trim();
        if (refrigerantChargeKg !== null && refrigerantChargeKg !== undefined)
            this.refrigerantChargeKg = refrigerantChargeKg;
        if (refrigerantGWP !== null && refrigerantGWP !== undefined)
            this.refrigerantGWP = refrigerantGWP;
        this.annualLeakageRateExpected = annualLeakageRateExpected ?? 0.05;
        if (meterId?.trim())
            this.meterId = meterId.trim();
        if (cloudDeviceId?.trim())
            this.cloudDeviceId = cloudDeviceId.trim();
        if (telemetryTopic?.trim())
            this.telemetryTopic = telemetryTopic.trim();
        this.isVirtualAsset = isVirtualAsset ?? false;
        this.dataQualityScore = dataQualityScore ?? 1;
        if (lastMaintenanceDate?.trim())
            this.lastMaintenanceDate = lastMaintenanceDate.trim();
        if (nextMaintenanceDate?.trim())
            this.nextMaintenanceDate = nextMaintenanceDate.trim();
        if (maintenanceVendor?.trim())
            this.maintenanceVendor = maintenanceVendor.trim();
        this.conditionIndex = conditionIndex;
        this.efficiencyDegradationFactor = efficiencyDegradationFactor ?? 0.02;
        this.redundancyLevel = redundancyLevel ?? 'N';
        if (mtbfHours !== null && mtbfHours !== undefined)
            this.mtbfHours = mtbfHours;
        this.tags =
            typeof tags === 'object' && tags !== null
                ? { ...tags }
                : {};
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
export const parseAssetDTO = (input) => {
    const d = AssetDTOSchema.parse(input);
    return new AssetDTO(d.id, d.organizationId, d.regionId, d.branchId, d.buildingId, d.costCenterId, d.name, d.assetTag, d.barcode, d.type, d.status, d.criticality, d.manufacturer, d.model, d.serialNumber, d.installationDate, d.usefulLifeYears, d.decommissionDate, d.isSignificantEnergyUse, d.nominalPowerKw, d.standbyPowerKw, d.energySource, d.nominalEfficiency, d.dutyCycleExpected, d.powerFactorTarget, d.ghgScope, d.emissionSourceCategory, d.fuelType, d.biogenicFraction, d.refrigerantGasType, d.refrigerantChargeKg, d.refrigerantGWP, d.annualLeakageRateExpected, d.meterId, d.cloudDeviceId, d.telemetryTopic, d.isVirtualAsset, d.dataQualityScore, d.lastMaintenanceDate, d.nextMaintenanceDate, d.maintenanceVendor, d.conditionIndex, d.efficiencyDegradationFactor, d.redundancyLevel, d.mtbfHours, d.tags, d.createdAt, d.updatedAt);
};
export const safeParseAssetDTO = (input) => AssetDTOSchema.safeParse(input);
//# sourceMappingURL=asset.dto.js.map