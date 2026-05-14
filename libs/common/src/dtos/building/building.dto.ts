import { z } from 'zod';
import { SmsIdSchema } from '../../schemas/sms-id.schema.js';
import { GeoCoordinatesDTOSchema } from '../common/geo.dto.js';
import {
  BuildingUsageTypeSchema,
  HvacTypeSchema,
  MainFuelTypeSchema,
  OperationalStatusSchema
} from '../common/graphql-setup-enums.js';

/** Calidad térmica de envolvente */
export const BuildingInsulationQualitySchema = z.enum(['POOR', 'AVERAGE', 'HIGH']);
/** Tipo de cubierta */
export const BuildingRoofTypeSchema = z.enum(['GREEN', 'REFLECTIVE', 'STANDARD']);
/** Estado técnico de mantenimiento / performance */
export const BuildingMaintenanceStatusSchema = z.enum(['OPTIMAL', 'DEGRADED', 'CRITICAL']);
/** Tecnología de iluminación dominante */
export const BuildingLightingTechnologySchema = z.enum(['LED', 'FLUORESCENT', 'HID', 'MIXED']);
/** Granularidad datos energía */
export const BuildingDataGranularitySchema = z.enum(['MANUAL', 'MONTHLY', 'DAILY', 'TELEMETRY']);
/** Topología submedición */
export const BuildingSubmeteringTopologySchema = z.enum(['CENTRALIZED', 'BY_FLOOR', 'BY_LOAD', 'NONE']);

export type BuildingInsulationQuality = z.infer<typeof BuildingInsulationQualitySchema>;
export type BuildingRoofType = z.infer<typeof BuildingRoofTypeSchema>;
export type BuildingMaintenanceStatus = z.infer<typeof BuildingMaintenanceStatusSchema>;
export type BuildingLightingTechnology = z.infer<typeof BuildingLightingTechnologySchema>;
export type BuildingDataGranularity = z.infer<typeof BuildingDataGranularitySchema>;
export type BuildingSubmeteringTopology = z.infer<typeof BuildingSubmeteringTopologySchema>;

export const BuildingDTOSchema = z.object({
  id: SmsIdSchema,
  organizationId: SmsIdSchema,
  regionId: SmsIdSchema,
  branchId: SmsIdSchema,
  name: z.string().min(1),
  status: OperationalStatusSchema,

  usageTypeEnum: BuildingUsageTypeSchema,
  m2Surface: z.number().nonnegative(),
  m3Volume: z.number().nonnegative(),
  footprintM2: z.number().nonnegative().optional(),
  floorsCount: z.number().int().min(1).default(1),
  yearBuilt: z.number().int().min(1800).max(9999),
  renovationYear: z.number().int().min(1800).max(9999).optional(),

  insulationQuality: BuildingInsulationQualitySchema.default('AVERAGE'),
  windowWallRatio: z.number().min(0).max(1).default(0.35),
  roofType: BuildingRoofTypeSchema.default('STANDARD'),
  coordinates: GeoCoordinatesDTOSchema,

  hvacType: HvacTypeSchema,
  hvacAgeYears: z.number().int().nonnegative().optional(),
  hvacEfficiencyRating: z.number().nonnegative().optional(),
  maintenanceStatus: BuildingMaintenanceStatusSchema.default('OPTIMAL'),
  lastEnergyAuditDate: z.string().min(1).optional(),
  mainFuelType: MainFuelTypeSchema,
  lightingTechnology: BuildingLightingTechnologySchema.default('LED'),
  lightingPowerDensity: z.number().nonnegative().optional(),
  hasBms: z.boolean(),
  bmsVendor: z.string().min(1).optional(),
  bmsProtocols: z.array(z.string().min(1)).default([]),

  hasSmartMetering: z.boolean(),
  dataGranularity: BuildingDataGranularitySchema.default('MONTHLY'),
  submeteringTopology: BuildingSubmeteringTopologySchema.default('NONE'),

  buildingCertifications: z.array(z.string().min(1)).default([]),
  epcRating: z.string().min(1).optional(),
  onsiteGenerationCapacityKw: z.number().nonnegative().optional(),
  airQualitySensors: z.boolean().default(false),
  waterRecyclingSystem: z.boolean().default(false),
  evChargingPoints: z.number().int().nonnegative().default(0),

  createdAt: z.string().min(1).optional(),
  updatedAt: z.string().min(1).optional(),

  /** Compat texto libre (no aparece en el constructor Enterprise nominal). */
  usageType: z.string().min(1).optional()
});

export class BuildingDTO {
  public readonly id: string;
  public readonly organizationId: string;
  public readonly regionId: string;
  public readonly branchId: string;
  public readonly name: string;
  public readonly status: z.infer<typeof OperationalStatusSchema>;
  public readonly usageTypeEnum: z.infer<typeof BuildingUsageTypeSchema>;
  public readonly m2Surface: number;
  public readonly m3Volume: number;
  public readonly footprintM2?: number;
  public readonly floorsCount: number;
  public readonly yearBuilt: number;
  public readonly renovationYear?: number;
  public readonly insulationQuality: z.infer<typeof BuildingInsulationQualitySchema>;
  public readonly windowWallRatio: number;
  public readonly roofType: z.infer<typeof BuildingRoofTypeSchema>;
  public readonly coordinates: z.infer<typeof GeoCoordinatesDTOSchema>;
  public readonly hvacType: z.infer<typeof HvacTypeSchema>;
  public readonly hvacAgeYears?: number;
  public readonly hvacEfficiencyRating?: number;
  public readonly maintenanceStatus: z.infer<typeof BuildingMaintenanceStatusSchema>;
  public readonly lastEnergyAuditDate?: string;
  public readonly mainFuelType: z.infer<typeof MainFuelTypeSchema>;
  public readonly lightingTechnology: z.infer<typeof BuildingLightingTechnologySchema>;
  public readonly lightingPowerDensity?: number;
  public readonly hasBms: boolean;
  public readonly bmsVendor?: string;
  public readonly bmsProtocols: string[];
  public readonly hasSmartMetering: boolean;
  public readonly dataGranularity: z.infer<typeof BuildingDataGranularitySchema>;
  public readonly submeteringTopology: z.infer<typeof BuildingSubmeteringTopologySchema>;
  public readonly buildingCertifications: string[];
  public readonly epcRating?: string;
  public readonly onsiteGenerationCapacityKw?: number;
  public readonly airQualitySensors: boolean;
  public readonly waterRecyclingSystem: boolean;
  public readonly evChargingPoints: number;
  public readonly createdAt?: string;
  public readonly updatedAt?: string;
  /** Legacy compat */
  public readonly usageType?: string;

  constructor(
    id: string,
    organizationId: string,
    regionId: string,
    branchId: string,
    name: string,
    status: z.infer<typeof OperationalStatusSchema>,
    usageTypeEnum: z.infer<typeof BuildingUsageTypeSchema>,
    m2Surface: number,
    m3Volume: number,
    footprintM2: number | null | undefined,
    floorsCount: number | null | undefined,
    yearBuilt: number,
    renovationYear: number | null | undefined,
    insulationQuality: z.infer<typeof BuildingInsulationQualitySchema> | null | undefined,
    windowWallRatio: number | null | undefined,
    roofType: z.infer<typeof BuildingRoofTypeSchema> | null | undefined,
    coordinates: z.infer<typeof GeoCoordinatesDTOSchema>,
    hvacType: z.infer<typeof HvacTypeSchema>,
    hvacAgeYears: number | null | undefined,
    hvacEfficiencyRating: number | null | undefined,
    maintenanceStatus: z.infer<typeof BuildingMaintenanceStatusSchema> | null | undefined,
    lastEnergyAuditDate: string | null | undefined,
    mainFuelType: z.infer<typeof MainFuelTypeSchema>,
    lightingTechnology: z.infer<typeof BuildingLightingTechnologySchema> | null | undefined,
    lightingPowerDensity: number | null | undefined,
    hasBms: boolean,
    bmsVendor: string | null | undefined,
    bmsProtocols: string[] | null | undefined,
    hasSmartMetering: boolean,
    dataGranularity: BuildingDataGranularity | null | undefined,
    submeteringTopology: BuildingSubmeteringTopology | null | undefined,
    buildingCertifications: string[] | null | undefined,
    epcRating: string | null | undefined,
    onsiteGenerationCapacityKw: number | null | undefined,
    airQualitySensors: boolean | null | undefined,
    waterRecyclingSystem: boolean | null | undefined,
    evChargingPoints: number | null | undefined,
    createdAt?: string,
    updatedAt?: string,
    usageType?: string
  ) {
    this.id = id;
    this.organizationId = organizationId;
    this.regionId = regionId;
    this.branchId = branchId;
    this.name = name;
    this.status = status;
    this.usageTypeEnum = usageTypeEnum;
    this.m2Surface = m2Surface;
    this.m3Volume = m3Volume;
    if (footprintM2 !== null && footprintM2 !== undefined) this.footprintM2 = footprintM2;
    this.floorsCount = floorsCount ?? 1;
    this.yearBuilt = yearBuilt;
    if (renovationYear !== null && renovationYear !== undefined) this.renovationYear = renovationYear;
    this.insulationQuality = insulationQuality ?? 'AVERAGE';
    this.windowWallRatio = windowWallRatio ?? 0.35;
    this.roofType = roofType ?? 'STANDARD';
    this.coordinates = coordinates;
    this.hvacType = hvacType;
    if (hvacAgeYears !== null && hvacAgeYears !== undefined) this.hvacAgeYears = hvacAgeYears;
    if (hvacEfficiencyRating !== null && hvacEfficiencyRating !== undefined) this.hvacEfficiencyRating = hvacEfficiencyRating;
    this.maintenanceStatus = maintenanceStatus ?? 'OPTIMAL';
    if (lastEnergyAuditDate?.trim()) this.lastEnergyAuditDate = lastEnergyAuditDate.trim();
    this.mainFuelType = mainFuelType;
    this.lightingTechnology = lightingTechnology ?? 'LED';
    if (lightingPowerDensity !== null && lightingPowerDensity !== undefined) this.lightingPowerDensity = lightingPowerDensity;
    this.hasBms = hasBms;
    if (bmsVendor?.trim()) this.bmsVendor = bmsVendor.trim();
    this.bmsProtocols = Array.isArray(bmsProtocols) ? bmsProtocols : [];
    this.hasSmartMetering = hasSmartMetering;
    this.dataGranularity = dataGranularity ?? 'MONTHLY';
    this.submeteringTopology = submeteringTopology ?? 'NONE';
    this.buildingCertifications = Array.isArray(buildingCertifications) ? buildingCertifications : [];
    if (epcRating?.trim()) this.epcRating = epcRating.trim();
    if (onsiteGenerationCapacityKw !== null && onsiteGenerationCapacityKw !== undefined)
      this.onsiteGenerationCapacityKw = onsiteGenerationCapacityKw;
    this.airQualitySensors = airQualitySensors ?? false;
    this.waterRecyclingSystem = waterRecyclingSystem ?? false;
    this.evChargingPoints = evChargingPoints ?? 0;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    if (usageType?.trim()) this.usageType = usageType.trim();
  }
}

export type BuildingDTOInput = z.infer<typeof BuildingDTOSchema>;

export const parseBuildingDTO = (input: unknown): BuildingDTO => {
  const d = BuildingDTOSchema.parse(input);
  return new BuildingDTO(
    d.id,
    d.organizationId,
    d.regionId,
    d.branchId,
    d.name,
    d.status,
    d.usageTypeEnum,
    d.m2Surface,
    d.m3Volume,
    d.footprintM2,
    d.floorsCount,
    d.yearBuilt,
    d.renovationYear,
    d.insulationQuality,
    d.windowWallRatio,
    d.roofType,
    d.coordinates,
    d.hvacType,
    d.hvacAgeYears,
    d.hvacEfficiencyRating,
    d.maintenanceStatus,
    d.lastEnergyAuditDate,
    d.mainFuelType,
    d.lightingTechnology,
    d.lightingPowerDensity,
    d.hasBms,
    d.bmsVendor,
    d.bmsProtocols,
    d.hasSmartMetering,
    d.dataGranularity,
    d.submeteringTopology,
    d.buildingCertifications,
    d.epcRating,
    d.onsiteGenerationCapacityKw,
    d.airQualitySensors,
    d.waterRecyclingSystem,
    d.evChargingPoints,
    d.createdAt,
    d.updatedAt,
    d.usageType
  );
};

export const safeParseBuildingDTO = (input: unknown) => BuildingDTOSchema.safeParse(input);
