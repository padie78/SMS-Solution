import { z } from 'zod';
import { SmsIdSchema } from '../../schemas/sms-id.schema.js';

export const EmissionFactorActivityTypeSchema = z.enum([
  'ELECTRICITY',
  'NATURAL_GAS',
  'DIESEL',
  'FLIGHT',
  'REFRIGERANT',
  'WASTE',
  'LOGISTICS'
]);

export const EmissionFactorScopeNumberSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const EmissionFactorPhysicalUnitSchema = z.enum([
  'KWH',
  'M3',
  'KG',
  'L',
  'TON_KM',
  'TJ',
  'PASSENGER_KM'
]);

export const EmissionFactorCalculationMethodSchema = z.enum(['LOCATION_BASED', 'MARKET_BASED']);

export const EmissionFactorGwpReferenceSchema = z.enum(['AR4', 'AR5', 'AR6']);

export const EmissionFactorCatalogStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'DEPRECATED',
  'ARCHIVED'
]);

export const EmissionFactorDataQualityTierSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5)
]);

function coerceScope(input: unknown): unknown {
  if (input === 1 || input === 2 || input === 3) return input;
  const s = String(input ?? '')
    .trim()
    .toUpperCase();
  if (s === 'SCOPE_1' || s === '1') return 1;
  if (s === 'SCOPE_2' || s === '2') return 2;
  if (s === 'SCOPE_3' || s === '3') return 3;
  return input;
}

function coerceActivityType(input: unknown): unknown {
  const s = String(input ?? '')
    .trim()
    .toUpperCase();
  if (!s) return input;
  if (s === 'ELEC' || s === 'ELECTRICITY' || s === 'ELECTRIC') return 'ELECTRICITY';
  if (s === 'GAS' || s === 'NATURAL_GAS' || s === 'NATURAL-GAS') return 'NATURAL_GAS';
  if (s === 'DIESEL' || s === 'FUEL') return 'DIESEL';
  if (s === 'FLIGHT') return 'FLIGHT';
  if (s === 'REFRIGERANT' || s === 'F_GAS') return 'REFRIGERANT';
  if (s === 'WASTE') return 'WASTE';
  if (s === 'LOGISTICS' || s === 'TRANSPORT') return 'LOGISTICS';
  return input;
}

function coercePhysicalUnit(input: unknown): unknown {
  const raw = String(input ?? '').trim();
  if (!raw) return input;
  const u = raw.toUpperCase().replace(/\s+/g, '_');
  if (raw.toLowerCase() === 'kg/kwh' || u === 'KG/KWH') return 'KWH';
  if (u === 'KWH' || u === 'KW·H') return 'KWH';
  return u.replace(/-/g, '_');
}

function coerceCalculationMethod(input: unknown): unknown {
  const s = String(input ?? '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_');
  if (!s) return input;
  if (s === 'LOCATION' || s === 'LOCATION_BASED') return 'LOCATION_BASED';
  if (s === 'MARKET' || s === 'MARKET_BASED') return 'MARKET_BASED';
  return input;
}

const tagsSchema = z.record(z.string(), z.string()).default({});

const isoLike = z.string().min(4).max(40).optional();

export function generateEmissionFactorId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  return typeof c?.randomUUID === 'function'
    ? c.randomUUID()
    : `emf_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export const EmissionFactorDTOSchema = z.object({
  id: SmsIdSchema.optional(),
  name: z.string().min(1),
  year: z.number().int().min(1900).max(9999),
  regionCode: z.string().min(1),
  activityType: z.preprocess(coerceActivityType, EmissionFactorActivityTypeSchema),
  scope: z.preprocess(coerceScope, EmissionFactorScopeNumberSchema),
  calculationMethod: z.preprocess(coerceCalculationMethod, EmissionFactorCalculationMethodSchema.optional()),
  unit: z.preprocess(coercePhysicalUnit, EmissionFactorPhysicalUnitSchema),
  value: z.number().nonnegative(),
  co2Value: z.number().nonnegative().optional(),
  ch4Value: z.number().nonnegative().optional(),
  n2oValue: z.number().nonnegative().optional(),
  hfcValue: z.number().nonnegative().optional(),
  gwpReference: EmissionFactorGwpReferenceSchema.default('AR6'),
  source: z.string().min(1),
  sourceUrl: z.string().min(4).optional(),
  dataQualityTier: EmissionFactorDataQualityTierSchema.default(3),
  uncertaintyPercentage: z.number().min(0).max(100).default(0),
  externalAuditDate: isoLike,
  isProjection: z.boolean().default(false),
  decarbonizationTrend: z.number().finite().default(0),
  biologicalCarbonStorage: z.number().nonnegative().optional(),
  status: EmissionFactorCatalogStatusSchema.default('ACTIVE'),
  tags: tagsSchema,
  createdAt: z.string().min(1).optional(),
  updatedAt: z.string().min(1).optional()
});

export type EmissionFactorDTOInput = z.infer<typeof EmissionFactorDTOSchema>;

export class EmissionFactorDTO {
  public readonly id: string;
  public readonly name: string;
  public readonly year: number;
  public readonly regionCode: string;
  public readonly activityType: z.infer<typeof EmissionFactorActivityTypeSchema>;
  public readonly scope: z.infer<typeof EmissionFactorScopeNumberSchema>;
  public readonly calculationMethod?: z.infer<typeof EmissionFactorCalculationMethodSchema>;
  public readonly unit: z.infer<typeof EmissionFactorPhysicalUnitSchema>;
  public readonly value: number;
  public readonly co2Value?: number;
  public readonly ch4Value?: number;
  public readonly n2oValue?: number;
  public readonly hfcValue?: number;
  public readonly gwpReference: z.infer<typeof EmissionFactorGwpReferenceSchema>;
  public readonly source: string;
  public readonly sourceUrl?: string;
  public readonly dataQualityTier: z.infer<typeof EmissionFactorDataQualityTierSchema>;
  public readonly uncertaintyPercentage: number;
  public readonly externalAuditDate?: string;
  public readonly isProjection: boolean;
  public readonly decarbonizationTrend: number;
  public readonly biologicalCarbonStorage?: number;
  public readonly status: z.infer<typeof EmissionFactorCatalogStatusSchema>;
  public readonly tags: Record<string, string>;
  public readonly createdAt?: string;
  public readonly updatedAt?: string;

  constructor(
    id: string,
    name: string,
    year: number,
    regionCode: string,
    activityType: z.infer<typeof EmissionFactorActivityTypeSchema>,
    scope: z.infer<typeof EmissionFactorScopeNumberSchema>,
    calculationMethod: z.infer<typeof EmissionFactorCalculationMethodSchema> | null | undefined,
    unit: z.infer<typeof EmissionFactorPhysicalUnitSchema>,
    value: number,
    co2Value: number | null | undefined,
    ch4Value: number | null | undefined,
    n2oValue: number | null | undefined,
    hfcValue: number | null | undefined,
    gwpReference: z.infer<typeof EmissionFactorGwpReferenceSchema> | null | undefined,
    source: string,
    sourceUrl: string | null | undefined,
    dataQualityTier: z.infer<typeof EmissionFactorDataQualityTierSchema>,
    uncertaintyPercentage: number | null | undefined,
    externalAuditDate: string | null | undefined,
    isProjection: boolean | null | undefined,
    decarbonizationTrend: number | null | undefined,
    biologicalCarbonStorage: number | null | undefined,
    status: z.infer<typeof EmissionFactorCatalogStatusSchema>,
    tags: Record<string, string> | null | undefined,
    createdAt?: string,
    updatedAt?: string
  ) {
    this.id = id;
    this.name = name.trim();
    this.year = year;
    this.regionCode = regionCode.trim();
    this.activityType = activityType;
    this.scope = scope;
    if (scope === 2) {
      this.calculationMethod = calculationMethod ?? 'LOCATION_BASED';
    } else if (calculationMethod !== null && calculationMethod !== undefined) {
      this.calculationMethod = calculationMethod;
    }
    this.unit = unit;
    this.value = value;
    if (co2Value !== null && co2Value !== undefined) this.co2Value = co2Value;
    if (ch4Value !== null && ch4Value !== undefined) this.ch4Value = ch4Value;
    if (n2oValue !== null && n2oValue !== undefined) this.n2oValue = n2oValue;
    if (hfcValue !== null && hfcValue !== undefined) this.hfcValue = hfcValue;
    this.gwpReference = gwpReference ?? 'AR6';
    this.source = source.trim();
    if (sourceUrl?.trim()) this.sourceUrl = sourceUrl.trim();
    this.dataQualityTier = dataQualityTier;
    const unc = uncertaintyPercentage ?? 0;
    this.uncertaintyPercentage = unc < 0 ? 0 : unc > 100 ? 100 : unc;
    if (externalAuditDate?.trim()) this.externalAuditDate = externalAuditDate.trim();
    this.isProjection = isProjection ?? false;
    this.decarbonizationTrend = decarbonizationTrend ?? 0;
    if (
      biologicalCarbonStorage !== null &&
      biologicalCarbonStorage !== undefined
    )
      this.biologicalCarbonStorage = biologicalCarbonStorage;
    this.status = status;
    this.tags = typeof tags === 'object' && tags !== null ? { ...tags } : {};
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

export const parseEmissionFactorDTO = (input: unknown): EmissionFactorDTO => {
  const d = EmissionFactorDTOSchema.parse(input);
  const id = d.id?.trim() ? d.id.trim() : generateEmissionFactorId();
  return new EmissionFactorDTO(
    id,
    d.name,
    d.year,
    d.regionCode,
    d.activityType,
    d.scope,
    d.calculationMethod,
    d.unit,
    d.value,
    d.co2Value,
    d.ch4Value,
    d.n2oValue,
    d.hfcValue,
    d.gwpReference,
    d.source,
    d.sourceUrl,
    d.dataQualityTier,
    d.uncertaintyPercentage,
    d.externalAuditDate,
    d.isProjection,
    d.decarbonizationTrend,
    d.biologicalCarbonStorage,
    d.status,
    d.tags,
    d.createdAt,
    d.updatedAt
  );
};

export const safeParseEmissionFactorDTO = (input: unknown) => EmissionFactorDTOSchema.safeParse(input);
