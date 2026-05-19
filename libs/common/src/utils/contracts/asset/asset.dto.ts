import { z } from 'zod';
import { SmsIdSchema } from '../../validation/schemas/sms-id.schema.js';
import { AssetTypeSchema } from '../shared/domain-enums.js';
import { AssetLifecycleStatusSchema } from '../shared/graphql-setup-enums.js';

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

export type AssetCriticality = z.infer<typeof AssetCriticalitySchema>;
export type AssetEnergySource = z.infer<typeof AssetEnergySourceSchema>;
export type AssetGhgScope = z.infer<typeof AssetGhgScopeSchema>;
export type AssetEmissionSourceCategory = z.infer<typeof AssetEmissionSourceCategorySchema>;
export type AssetConditionIndex = z.infer<typeof AssetConditionIndexSchema>;
export type AssetRedundancyLevel = z.infer<typeof AssetRedundancyLevelSchema>;

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
  public readonly id: string;
  public readonly organizationId: string;
  public readonly regionId: string;
  public readonly branchId: string;
  public readonly buildingId: string;
  public readonly costCenterId: string;
  public readonly name: string;
  public readonly assetTag?: string;
  public readonly barcode?: string;
  public readonly type: z.infer<typeof AssetTypeSchema>;
  public readonly status: z.infer<typeof AssetLifecycleStatusSchema>;
  public readonly criticality: z.infer<typeof AssetCriticalitySchema>;
  public readonly manufacturer?: string;
  public readonly model?: string;
  public readonly serialNumber?: string;
  public readonly installationDate: string;
  public readonly usefulLifeYears: number;
  public readonly decommissionDate?: string;
  public readonly isSignificantEnergyUse: boolean;
  public readonly nominalPowerKw: number;
  public readonly standbyPowerKw?: number;
  public readonly energySource: z.infer<typeof AssetEnergySourceSchema>;
  public readonly nominalEfficiency: number;
  public readonly dutyCycleExpected: number;
  public readonly powerFactorTarget: number;
  public readonly ghgScope: z.infer<typeof AssetGhgScopeSchema>;
  public readonly emissionSourceCategory: z.infer<typeof AssetEmissionSourceCategorySchema>;
  public readonly fuelType?: string;
  public readonly biogenicFraction: number;
  public readonly refrigerantGasType?: string;
  public readonly refrigerantChargeKg?: number;
  public readonly refrigerantGWP?: number;
  public readonly annualLeakageRateExpected: number;
  public readonly meterId?: string;
  public readonly cloudDeviceId?: string;
  public readonly telemetryTopic?: string;
  public readonly isVirtualAsset: boolean;
  public readonly dataQualityScore: number;
  public readonly lastMaintenanceDate?: string;
  public readonly nextMaintenanceDate?: string;
  public readonly maintenanceVendor?: string;
  public readonly conditionIndex: z.infer<typeof AssetConditionIndexSchema>;
  public readonly efficiencyDegradationFactor: number;
  public readonly redundancyLevel: z.infer<typeof AssetRedundancyLevelSchema>;
  public readonly mtbfHours?: number;
  public readonly tags: Record<string, string>;
  public readonly createdAt?: string;
  public readonly updatedAt?: string;

  constructor(
    id: string,
    organizationId: string,
    regionId: string,
    branchId: string,
    buildingId: string,
    costCenterId: string,
    name: string,
    assetTag: string | null | undefined,
    barcode: string | null | undefined,
    type: z.infer<typeof AssetTypeSchema>,
    status: z.infer<typeof AssetLifecycleStatusSchema>,
    criticality: z.infer<typeof AssetCriticalitySchema> | null | undefined,
    manufacturer: string | null | undefined,
    model: string | null | undefined,
    serialNumber: string | null | undefined,
    installationDate: string,
    usefulLifeYears: number,
    decommissionDate: string | null | undefined,
    isSignificantEnergyUse: boolean | null | undefined,
    nominalPowerKw: number,
    standbyPowerKw: number | null | undefined,
    energySource: z.infer<typeof AssetEnergySourceSchema>,
    nominalEfficiency: number,
    dutyCycleExpected: number | null | undefined,
    powerFactorTarget: number | null | undefined,
    ghgScope: z.infer<typeof AssetGhgScopeSchema>,
    emissionSourceCategory: z.infer<typeof AssetEmissionSourceCategorySchema>,
    fuelType: string | null | undefined,
    biogenicFraction: number | null | undefined,
    refrigerantGasType: string | null | undefined,
    refrigerantChargeKg: number | null | undefined,
    refrigerantGWP: number | null | undefined,
    annualLeakageRateExpected: number | null | undefined,
    meterId: string | null | undefined,
    cloudDeviceId: string | null | undefined,
    telemetryTopic: string | null | undefined,
    isVirtualAsset: boolean | null | undefined,
    dataQualityScore: number | null | undefined,
    lastMaintenanceDate: string | null | undefined,
    nextMaintenanceDate: string | null | undefined,
    maintenanceVendor: string | null | undefined,
    conditionIndex: z.infer<typeof AssetConditionIndexSchema>,
    efficiencyDegradationFactor: number | null | undefined,
    redundancyLevel: z.infer<typeof AssetRedundancyLevelSchema> | null | undefined,
    mtbfHours: number | null | undefined,
    tags: Record<string, string> | null | undefined,
    createdAt?: string,
    updatedAt?: string
  ) {
    this.id = id;
    this.organizationId = organizationId;
    this.regionId = regionId;
    this.branchId = branchId;
    this.buildingId = buildingId;
    const cc =
      typeof costCenterId === 'string' && costCenterId.trim() !== '' ? costCenterId.trim() : 'cc-unassigned';
    this.costCenterId = cc;
    this.name = name;
    if (assetTag?.trim()) this.assetTag = assetTag.trim();
    if (barcode?.trim()) this.barcode = barcode.trim();
    this.type = type;
    this.status = status;
    this.criticality = criticality ?? 'MEDIUM';
    if (manufacturer?.trim()) this.manufacturer = manufacturer.trim();
    if (model?.trim()) this.model = model.trim();
    if (serialNumber?.trim()) this.serialNumber = serialNumber.trim();
    this.installationDate = installationDate;
    this.usefulLifeYears = usefulLifeYears;
    if (decommissionDate?.trim()) this.decommissionDate = decommissionDate.trim();
    this.isSignificantEnergyUse = isSignificantEnergyUse ?? false;
    this.nominalPowerKw = nominalPowerKw;
    if (standbyPowerKw !== null && standbyPowerKw !== undefined) this.standbyPowerKw = standbyPowerKw;
    this.energySource = energySource;
    this.nominalEfficiency = nominalEfficiency;
    this.dutyCycleExpected = dutyCycleExpected ?? 0.8;
    this.powerFactorTarget = powerFactorTarget ?? 0.95;
    this.ghgScope = ghgScope;
    this.emissionSourceCategory = emissionSourceCategory;
    if (fuelType?.trim()) this.fuelType = fuelType.trim();
    this.biogenicFraction = biogenicFraction ?? 0;
    if (refrigerantGasType?.trim()) this.refrigerantGasType = refrigerantGasType.trim();
    if (refrigerantChargeKg !== null && refrigerantChargeKg !== undefined) this.refrigerantChargeKg = refrigerantChargeKg;
    if (refrigerantGWP !== null && refrigerantGWP !== undefined) this.refrigerantGWP = refrigerantGWP;
    this.annualLeakageRateExpected = annualLeakageRateExpected ?? 0.05;
    if (meterId?.trim()) this.meterId = meterId.trim();
    if (cloudDeviceId?.trim()) this.cloudDeviceId = cloudDeviceId.trim();
    if (telemetryTopic?.trim()) this.telemetryTopic = telemetryTopic.trim();
    this.isVirtualAsset = isVirtualAsset ?? false;
    this.dataQualityScore = dataQualityScore ?? 1;
    if (lastMaintenanceDate?.trim()) this.lastMaintenanceDate = lastMaintenanceDate.trim();
    if (nextMaintenanceDate?.trim()) this.nextMaintenanceDate = nextMaintenanceDate.trim();
    if (maintenanceVendor?.trim()) this.maintenanceVendor = maintenanceVendor.trim();
    this.conditionIndex = conditionIndex;
    this.efficiencyDegradationFactor = efficiencyDegradationFactor ?? 0.02;
    this.redundancyLevel = redundancyLevel ?? 'N';
    if (mtbfHours !== null && mtbfHours !== undefined) this.mtbfHours = mtbfHours;
    this.tags =
      typeof tags === 'object' && tags !== null
        ? { ...tags }
        : {};
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

export type AssetDTOInput = z.infer<typeof AssetDTOSchema>;

export const parseAssetDTO = (input: unknown): AssetDTO => {
  const d = AssetDTOSchema.parse(input);
  return new AssetDTO(
    d.id,
    d.organizationId,
    d.regionId,
    d.branchId,
    d.buildingId,
    d.costCenterId,
    d.name,
    d.assetTag,
    d.barcode,
    d.type,
    d.status,
    d.criticality,
    d.manufacturer,
    d.model,
    d.serialNumber,
    d.installationDate,
    d.usefulLifeYears,
    d.decommissionDate,
    d.isSignificantEnergyUse,
    d.nominalPowerKw,
    d.standbyPowerKw,
    d.energySource,
    d.nominalEfficiency,
    d.dutyCycleExpected,
    d.powerFactorTarget,
    d.ghgScope,
    d.emissionSourceCategory,
    d.fuelType,
    d.biogenicFraction,
    d.refrigerantGasType,
    d.refrigerantChargeKg,
    d.refrigerantGWP,
    d.annualLeakageRateExpected,
    d.meterId,
    d.cloudDeviceId,
    d.telemetryTopic,
    d.isVirtualAsset,
    d.dataQualityScore,
    d.lastMaintenanceDate,
    d.nextMaintenanceDate,
    d.maintenanceVendor,
    d.conditionIndex,
    d.efficiencyDegradationFactor,
    d.redundancyLevel,
    d.mtbfHours,
    d.tags,
    d.createdAt,
    d.updatedAt
  );
};

export const safeParseAssetDTO = (input: unknown) => AssetDTOSchema.safeParse(input);
