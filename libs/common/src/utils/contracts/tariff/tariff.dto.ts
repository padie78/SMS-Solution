import { z } from 'zod';
import { SmsIdSchema } from '../../validation/schemas/sms-id.schema.js';
import {
  EnergyServiceTypeSchema,
  TariffLifecycleStatusSchema,
  TariffPricingModelSchema
} from '../shared/graphql-setup-enums.js';

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const TariffDemandChargeUnitSchema = z.enum(['KW', 'KVA']);
export const TariffSeasonSchema = z.enum(['SUMMER', 'WINTER', 'TRANSITION', 'ALL_YEAR']);

export type TariffDemandChargeUnit = z.infer<typeof TariffDemandChargeUnitSchema>;
export type TariffSeason = z.infer<typeof TariffSeasonSchema>;

export const TariffTierRatePairSchema = z.object({
  limit: z.number().nonnegative(),
  rate: z.number().nonnegative()
});

const tagsSchema = z.record(z.string(), z.string()).default({});

/** Genera id estable para mutaciones sin `id` en el input. */
export function generateTariffId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  return typeof c?.randomUUID === 'function'
    ? c.randomUUID()
    : `trf_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export const TariffDTOSchema = z.object({
  id: SmsIdSchema.optional(),
  orgId: SmsIdSchema,
  branchId: SmsIdSchema,
  buildingId: SmsIdSchema.optional(),
  serviceType: EnergyServiceTypeSchema,
  providerName: z.string().min(1),
  contractId: z.string().min(1),
  pricingModel: TariffPricingModelSchema,
  currency: z.string().min(1).max(8).default('ILS'),
  baseRate: z.number().nonnegative(),
  expectedAverageRate: z.number().nonnegative().optional(),
  demandChargeRate: z.number().nonnegative().optional(),
  demandChargeUnit: TariffDemandChargeUnitSchema.default('KW'),
  fixedMonthlyFee: z.number().nonnegative().optional(),
  taxPercentage: z.number().min(0).max(1).default(0.17),
  touScheduleId: z.string().min(1).optional(),
  peakRate: z.number().nonnegative().optional(),
  valleyRate: z.number().nonnegative().optional(),
  shoulderRate: z.number().nonnegative().optional(),
  season: TariffSeasonSchema.default('ALL_YEAR'),
  tieredRates: z.array(TariffTierRatePairSchema).optional(),
  fuelAdjustmentFactor: z.number().positive().default(1),
  indexReferenceId: z.string().min(1).optional(),
  indexAdjustmentFormula: z.string().min(1).optional(),
  volatilityIndex: z.number().min(0).max(1).default(0),
  reactiveEnergyCharge: z.number().nonnegative().optional(),
  powerFactorThreshold: z.number().min(0).max(1).default(0.95),
  greenPremium: z.number().nonnegative().default(0),
  carbonTaxRate: z.number().nonnegative().optional(),
  efficiencyRebateRate: z.number().nonnegative().optional(),
  validFrom: isoDateSchema,
  validTo: isoDateSchema,
  billingCycleDay: z.number().int().min(1).max(31).default(1),
  status: TariffLifecycleStatusSchema.default('ACTIVE'),
  tags: tagsSchema,
  createdAt: z.string().min(1).optional(),
  updatedAt: z.string().min(1).optional()
});

export type TariffDTOInput = z.infer<typeof TariffDTOSchema>;

export type TariffTierRatePair = z.infer<typeof TariffTierRatePairSchema>;

export class TariffDTO {
  public readonly id: string;
  public readonly orgId: string;
  public readonly branchId: string;
  public readonly buildingId?: string;
  public readonly serviceType: z.infer<typeof EnergyServiceTypeSchema>;
  public readonly providerName: string;
  public readonly contractId: string;
  public readonly pricingModel: z.infer<typeof TariffPricingModelSchema>;
  public readonly currency: string;
  public readonly baseRate: number;
  public readonly expectedAverageRate?: number;
  public readonly demandChargeRate?: number;
  public readonly demandChargeUnit: z.infer<typeof TariffDemandChargeUnitSchema>;
  public readonly fixedMonthlyFee?: number;
  public readonly taxPercentage: number;
  public readonly touScheduleId?: string;
  public readonly peakRate?: number;
  public readonly valleyRate?: number;
  public readonly shoulderRate?: number;
  public readonly season: z.infer<typeof TariffSeasonSchema>;
  public readonly tieredRates?: TariffTierRatePair[];
  public readonly fuelAdjustmentFactor: number;
  public readonly indexReferenceId?: string;
  public readonly indexAdjustmentFormula?: string;
  public readonly volatilityIndex: number;
  public readonly reactiveEnergyCharge?: number;
  public readonly powerFactorThreshold: number;
  public readonly greenPremium: number;
  public readonly carbonTaxRate?: number;
  public readonly efficiencyRebateRate?: number;
  public readonly validFrom: string;
  public readonly validTo: string;
  public readonly billingCycleDay: number;
  public readonly status: z.infer<typeof TariffLifecycleStatusSchema>;
  public readonly tags: Record<string, string>;
  public readonly createdAt?: string;
  public readonly updatedAt?: string;

  constructor(
    id: string,
    orgId: string,
    branchId: string,
    buildingId: string | null | undefined,
    serviceType: z.infer<typeof EnergyServiceTypeSchema>,
    providerName: string,
    contractId: string,
    pricingModel: z.infer<typeof TariffPricingModelSchema>,
    currency: string | null | undefined,
    baseRate: number,
    expectedAverageRate: number | null | undefined,
    demandChargeRate: number | null | undefined,
    demandChargeUnit: z.infer<typeof TariffDemandChargeUnitSchema> | null | undefined,
    fixedMonthlyFee: number | null | undefined,
    taxPercentage: number | null | undefined,
    touScheduleId: string | null | undefined,
    peakRate: number | null | undefined,
    valleyRate: number | null | undefined,
    shoulderRate: number | null | undefined,
    season: z.infer<typeof TariffSeasonSchema> | null | undefined,
    tieredRates: TariffTierRatePair[] | null | undefined,
    fuelAdjustmentFactor: number | null | undefined,
    indexReferenceId: string | null | undefined,
    indexAdjustmentFormula: string | null | undefined,
    volatilityIndex: number | null | undefined,
    reactiveEnergyCharge: number | null | undefined,
    powerFactorThreshold: number | null | undefined,
    greenPremium: number | null | undefined,
    carbonTaxRate: number | null | undefined,
    efficiencyRebateRate: number | null | undefined,
    validFrom: string,
    validTo: string,
    billingCycleDay: number | null | undefined,
    status: z.infer<typeof TariffLifecycleStatusSchema>,
    tags: Record<string, string> | null | undefined,
    createdAt?: string,
    updatedAt?: string
  ) {
    this.id = id;
    this.orgId = orgId;
    this.branchId = branchId;
    if (buildingId?.trim()) this.buildingId = buildingId.trim();
    this.serviceType = serviceType;
    this.providerName = providerName.trim();
    this.contractId = contractId.trim();
    this.pricingModel = pricingModel;
    const c = currency?.trim() ? currency.trim().toUpperCase().slice(0, 8) : 'ILS';
    this.currency = c.length > 0 ? c : 'ILS';
    this.baseRate = baseRate;
    if (expectedAverageRate !== null && expectedAverageRate !== undefined) this.expectedAverageRate = expectedAverageRate;
    if (demandChargeRate !== null && demandChargeRate !== undefined) this.demandChargeRate = demandChargeRate;
    this.demandChargeUnit = demandChargeUnit ?? 'KW';
    if (fixedMonthlyFee !== null && fixedMonthlyFee !== undefined) this.fixedMonthlyFee = fixedMonthlyFee;
    const tx = taxPercentage ?? 0.17;
    this.taxPercentage = tx;
    if (touScheduleId?.trim()) this.touScheduleId = touScheduleId.trim();
    if (peakRate !== null && peakRate !== undefined) this.peakRate = peakRate;
    if (valleyRate !== null && valleyRate !== undefined) this.valleyRate = valleyRate;
    if (shoulderRate !== null && shoulderRate !== undefined) this.shoulderRate = shoulderRate;
    this.season = season ?? 'ALL_YEAR';
    if (tieredRates !== null && tieredRates !== undefined && tieredRates.length > 0) {
      this.tieredRates = tieredRates.map((t) => ({ limit: t.limit, rate: t.rate }));
    }
    const fuel = fuelAdjustmentFactor ?? 1;
    this.fuelAdjustmentFactor = fuel > 0 ? fuel : 1;
    if (indexReferenceId?.trim()) this.indexReferenceId = indexReferenceId.trim();
    if (indexAdjustmentFormula?.trim()) this.indexAdjustmentFormula = indexAdjustmentFormula.trim();
    const vol = volatilityIndex ?? 0;
    this.volatilityIndex = Math.min(1, Math.max(0, vol));
    if (reactiveEnergyCharge !== null && reactiveEnergyCharge !== undefined) this.reactiveEnergyCharge = reactiveEnergyCharge;
    const pf = powerFactorThreshold ?? 0.95;
    this.powerFactorThreshold = Math.min(1, Math.max(0, pf));
    this.greenPremium = greenPremium ?? 0;
    if (carbonTaxRate !== null && carbonTaxRate !== undefined) this.carbonTaxRate = carbonTaxRate;
    if (efficiencyRebateRate !== null && efficiencyRebateRate !== undefined) this.efficiencyRebateRate = efficiencyRebateRate;
    this.validFrom = validFrom.trim();
    this.validTo = validTo.trim();
    const bcd = billingCycleDay ?? 1;
    this.billingCycleDay = Math.min(31, Math.max(1, Math.floor(bcd)));
    this.status = status;
    this.tags = typeof tags === 'object' && tags !== null ? { ...tags } : {};
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

export const parseTariffDTO = (input: unknown): TariffDTO => {
  const d = TariffDTOSchema.parse(input);
  const id = d.id?.trim() ? d.id.trim() : generateTariffId();
  return new TariffDTO(
    id,
    d.orgId,
    d.branchId,
    d.buildingId,
    d.serviceType,
    d.providerName,
    d.contractId,
    d.pricingModel,
    d.currency,
    d.baseRate,
    d.expectedAverageRate,
    d.demandChargeRate,
    d.demandChargeUnit,
    d.fixedMonthlyFee,
    d.taxPercentage,
    d.touScheduleId,
    d.peakRate,
    d.valleyRate,
    d.shoulderRate,
    d.season,
    d.tieredRates,
    d.fuelAdjustmentFactor,
    d.indexReferenceId,
    d.indexAdjustmentFormula,
    d.volatilityIndex,
    d.reactiveEnergyCharge,
    d.powerFactorThreshold,
    d.greenPremium,
    d.carbonTaxRate,
    d.efficiencyRebateRate,
    d.validFrom,
    d.validTo,
    d.billingCycleDay,
    d.status,
    d.tags,
    d.createdAt,
    d.updatedAt
  );
};

export const safeParseTariffDTO = (input: unknown) => TariffDTOSchema.safeParse(input);
