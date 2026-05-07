import { z } from 'zod';
import { SmsIdSchema } from '../shared/sms-id.schema.js';
import { GeoCoordinatesDTOSchema } from '../shared/geo.dto.js';
import { LifecycleStatusSchema } from '../shared/graphql-setup-enums.js';

export const ClimateZoneSchema = z.enum(['TROPICAL', 'DRY', 'TEMPERATE', 'CONTINENTAL', 'POLAR']);
export const CarbonMarketTypeSchema = z.enum(['TAX', 'ETS', 'NONE']);
export const MaturityLevelSchema = z.enum(['MANUAL', 'SEMIAUTOMATED', 'IOT_READY']);
export const EconomicAreaSchema = z.enum(['EMEA', 'LATAM', 'APAC', 'NA']);

export type ClimateZone = z.infer<typeof ClimateZoneSchema>;
export type CarbonMarketType = z.infer<typeof CarbonMarketTypeSchema>;
export type MaturityLevel = z.infer<typeof MaturityLevelSchema>;
export type EconomicArea = z.infer<typeof EconomicAreaSchema>;

export const RegionalManagerDTOSchema = z.object({
  name: z.string().min(1),
  email: z.string().min(3),
  phone: z.string().min(3).optional()
});

export const RegionDTOSchema = z.object({
  // --- 1. IDENTIDAD Y JERARQUÍA ---
  id: SmsIdSchema,
  organizationId: SmsIdSchema,
  name: z.string().min(1),
  code: z.string().min(1),

  // --- 2. GEO-ANALYTICS ---
  countryCode: z.string().min(2).max(2),
  timezone: z.string().min(1),
  coordinates: GeoCoordinatesDTOSchema,
  climateZone: ClimateZoneSchema,
  avgHDD: z.number().nonnegative().default(0),
  avgCDD: z.number().nonnegative().default(0),

  // --- 3. DENOMINADORES DE KPI ---
  totalRegionalM2: z.number().nonnegative().default(0),
  totalHeadcount: z.number().nonnegative().default(0),
  annualRevenueTarget: z.number().nonnegative().optional(),

  // --- 4. ESTRATEGIA FINANCIERA Y ESG ---
  gridEmissionFactor: z.number().nonnegative().default(0),
  carbonTaxRate: z.number().nonnegative().default(0),
  carbonMarketType: CarbonMarketTypeSchema.default('NONE'),
  marginalAbatementCost: z.number().nonnegative().default(0),
  renewableEnergyAvailability: z.number().min(0).max(1).default(0),
  gridRenewableShare: z.number().min(0).max(100).default(0),
  waterStressIndex: z.number().min(0).max(1).default(0),

  // --- 5. COMPLIANCE Y GOBERNANZA ---
  localRegulations: z.array(z.string().min(1)).default([]),
  maturityLevel: MaturityLevelSchema,
  economicArea: EconomicAreaSchema,
  regionalManager: RegionalManagerDTOSchema,

  // --- 6. METAS Y BENCHMARKING ---
  regionalReductionTarget: z.number().default(0),
  energyScarcityRisk: z.number().min(0).max(1).default(0),
  status: z.preprocess((v) => (v === null ? undefined : v), LifecycleStatusSchema.default('ACTIVE')),

  // --- 7. AUDITORÍA ---
  createdAt: z.string().min(1).optional(),
  updatedAt: z.string().min(1).optional(),

  /**
   * Legacy/back-compat (UI antigua). Se mantiene para no romper modelos en memoria.
   * No forma parte del estándar Enterprise.
   */
  description: z.string().min(1).optional()
});

export class RegionDTO {
  public readonly id: string;
  public readonly organizationId: string;
  public readonly name: string;
  public readonly code: string;
  public readonly countryCode: string;
  public readonly timezone: string;
  public readonly coordinates: { lat: number; lng: number };
  public readonly climateZone: ClimateZone;
  public readonly avgHDD: number;
  public readonly avgCDD: number;
  public readonly totalRegionalM2: number;
  public readonly totalHeadcount: number;
  public readonly annualRevenueTarget?: number;
  public readonly gridEmissionFactor: number;
  public readonly carbonTaxRate: number;
  public readonly carbonMarketType: CarbonMarketType;
  public readonly marginalAbatementCost: number;
  public readonly renewableEnergyAvailability: number;
  public readonly gridRenewableShare: number;
  public readonly waterStressIndex: number;
  public readonly localRegulations: string[];
  public readonly maturityLevel: MaturityLevel;
  public readonly economicArea: EconomicArea;
  public readonly regionalManager: { name: string; email: string; phone?: string };
  public readonly regionalReductionTarget: number;
  public readonly energyScarcityRisk: number;
  public readonly status: z.infer<typeof LifecycleStatusSchema>;
  public readonly createdAt?: string;
  public readonly updatedAt?: string;

  /** Legacy/back-compat (UI antigua). */
  public readonly description?: string;

  constructor(
    id: string,
    organizationId: string,
    name: string,
    code: string,
    countryCode: string,
    timezone: string,
    coordinates: { lat: number; lng: number },
    climateZone: ClimateZone,
    avgHDD: number | null | undefined,
    avgCDD: number | null | undefined,
    totalRegionalM2: number | null | undefined,
    totalHeadcount: number | null | undefined,
    annualRevenueTarget: number | null | undefined,
    gridEmissionFactor: number | null | undefined,
    carbonTaxRate: number | null | undefined,
    carbonMarketType: CarbonMarketType | null | undefined,
    marginalAbatementCost: number | null | undefined,
    renewableEnergyAvailability: number | null | undefined,
    gridRenewableShare: number | null | undefined,
    waterStressIndex: number | null | undefined,
    localRegulations: string[] | null | undefined,
    maturityLevel: MaturityLevel,
    economicArea: EconomicArea,
    regionalManager: { name: string; email: string; phone?: string },
    regionalReductionTarget: number | null | undefined,
    energyScarcityRisk: number | null | undefined,
    status: z.infer<typeof LifecycleStatusSchema> | null | undefined,
    createdAt?: string,
    updatedAt?: string,
    description?: string
  ) {
    this.id = id;
    this.organizationId = organizationId;
    this.name = name;
    this.code = code;
    this.countryCode = countryCode;
    this.timezone = timezone;
    this.coordinates = coordinates;
    this.climateZone = climateZone;
    this.avgHDD = avgHDD ?? 0;
    this.avgCDD = avgCDD ?? 0;
    this.totalRegionalM2 = totalRegionalM2 ?? 0;
    this.totalHeadcount = totalHeadcount ?? 0;
    if (annualRevenueTarget !== null && annualRevenueTarget !== undefined) this.annualRevenueTarget = annualRevenueTarget;
    this.gridEmissionFactor = gridEmissionFactor ?? 0;
    this.carbonTaxRate = carbonTaxRate ?? 0;
    this.carbonMarketType = carbonMarketType ?? 'NONE';
    this.marginalAbatementCost = marginalAbatementCost ?? 0;
    this.renewableEnergyAvailability = renewableEnergyAvailability ?? 0;
    this.gridRenewableShare = gridRenewableShare ?? 0;
    this.waterStressIndex = waterStressIndex ?? 0;
    this.localRegulations = Array.isArray(localRegulations) ? localRegulations : [];
    this.maturityLevel = maturityLevel;
    this.economicArea = economicArea;
    this.regionalManager = regionalManager;
    this.regionalReductionTarget = regionalReductionTarget ?? 0;
    this.energyScarcityRisk = energyScarcityRisk ?? 0;
    this.status = status ?? 'ACTIVE';
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    if (description?.trim()) this.description = description;
  }
}

export type RegionDTOInput = z.infer<typeof RegionDTOSchema>;

export const parseRegionDTO = (input: unknown): RegionDTO => {
  const dto = RegionDTOSchema.parse(input);
  return new RegionDTO(
    dto.id,
    dto.organizationId,
    dto.name,
    dto.code,
    dto.countryCode,
    dto.timezone,
    dto.coordinates,
    dto.climateZone,
    dto.avgHDD,
    dto.avgCDD,
    dto.totalRegionalM2,
    dto.totalHeadcount,
    dto.annualRevenueTarget,
    dto.gridEmissionFactor,
    dto.carbonTaxRate,
    dto.carbonMarketType,
    dto.marginalAbatementCost,
    dto.renewableEnergyAvailability,
    dto.gridRenewableShare,
    dto.waterStressIndex,
    dto.localRegulations,
    dto.maturityLevel,
    dto.economicArea,
    dto.regionalManager,
    dto.regionalReductionTarget,
    dto.energyScarcityRisk,
    dto.status,
    dto.createdAt,
    dto.updatedAt,
    dto.description
  );
};

export const safeParseRegionDTO = (input: unknown) => RegionDTOSchema.safeParse(input);
