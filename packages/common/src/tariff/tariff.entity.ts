import { SmsDomainError } from '../shared/sms-domain-error.js';
import type {
  EnergyServiceType,
  TariffLifecycleStatus,
  TariffPricingModel
} from '../shared/graphql-setup-enums.js';
import type { z } from 'zod';
import {
  TariffDTO,
  TariffDemandChargeUnitSchema,
  TariffSeasonSchema,
  type TariffTierRatePair
} from './tariff.dto.js';

type DemandChargeUnit = z.infer<typeof TariffDemandChargeUnitSchema>;
type TariffSeason = z.infer<typeof TariffSeasonSchema>;

/** Contrato tarifario con benchmarking, demanda y capa ESG. */
export class TariffEntity {
  public readonly id: string;
  public readonly orgId: string;
  public readonly branchId: string;
  public readonly buildingId?: string;
  public readonly providerName: string;
  public readonly contractId: string;
  public readonly serviceType: EnergyServiceType;
  public readonly pricingModel: TariffPricingModel;
  public readonly currency: string;
  public readonly baseRate: number;
  public readonly expectedAverageRate?: number;
  public readonly demandChargeRate?: number;
  public readonly demandChargeUnit: DemandChargeUnit;
  public readonly fixedMonthlyFee?: number;
  public readonly taxPercentage: number;
  public readonly touScheduleId?: string;
  public readonly peakRate?: number;
  public readonly valleyRate?: number;
  public readonly shoulderRate?: number;
  public readonly season: TariffSeason;
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
  public readonly status: TariffLifecycleStatus;
  public readonly tags: Record<string, string>;
  public readonly createdAt?: string;
  public readonly updatedAt?: string;

  constructor(
    id: string,
    orgId: string,
    branchId: string,
    buildingId: string | undefined,
    providerName: string,
    contractId: string,
    serviceType: EnergyServiceType,
    pricingModel: TariffPricingModel,
    currency: string,
    baseRate: number,
    expectedAverageRate: number | undefined,
    demandChargeRate: number | undefined,
    demandChargeUnit: DemandChargeUnit,
    fixedMonthlyFee: number | undefined,
    taxPercentage: number,
    touScheduleId: string | undefined,
    peakRate: number | undefined,
    valleyRate: number | undefined,
    shoulderRate: number | undefined,
    season: TariffSeason,
    tieredRates: TariffTierRatePair[] | undefined,
    fuelAdjustmentFactor: number,
    indexReferenceId: string | undefined,
    indexAdjustmentFormula: string | undefined,
    volatilityIndex: number,
    reactiveEnergyCharge: number | undefined,
    powerFactorThreshold: number,
    greenPremium: number,
    carbonTaxRate: number | undefined,
    efficiencyRebateRate: number | undefined,
    validFrom: string,
    validTo: string,
    billingCycleDay: number,
    status: TariffLifecycleStatus,
    tags: Record<string, string>,
    createdAt?: string,
    updatedAt?: string
  ) {
    this.id = id;
    this.orgId = orgId;
    this.branchId = branchId;
    if (buildingId !== undefined) this.buildingId = buildingId;
    this.providerName = providerName;
    this.contractId = contractId;
    this.serviceType = serviceType;
    this.pricingModel = pricingModel;
    this.currency = currency;
    this.baseRate = baseRate;
    if (expectedAverageRate !== undefined) this.expectedAverageRate = expectedAverageRate;
    if (demandChargeRate !== undefined) this.demandChargeRate = demandChargeRate;
    this.demandChargeUnit = demandChargeUnit;
    if (fixedMonthlyFee !== undefined) this.fixedMonthlyFee = fixedMonthlyFee;
    this.taxPercentage = taxPercentage;
    if (touScheduleId !== undefined) this.touScheduleId = touScheduleId;
    if (peakRate !== undefined) this.peakRate = peakRate;
    if (valleyRate !== undefined) this.valleyRate = valleyRate;
    if (shoulderRate !== undefined) this.shoulderRate = shoulderRate;
    this.season = season;
    if (tieredRates !== undefined && tieredRates.length > 0) this.tieredRates = tieredRates.map((t) => ({ ...t }));
    this.fuelAdjustmentFactor = fuelAdjustmentFactor;
    if (indexReferenceId !== undefined) this.indexReferenceId = indexReferenceId;
    if (indexAdjustmentFormula !== undefined) this.indexAdjustmentFormula = indexAdjustmentFormula;
    this.volatilityIndex = volatilityIndex;
    if (reactiveEnergyCharge !== undefined) this.reactiveEnergyCharge = reactiveEnergyCharge;
    this.powerFactorThreshold = powerFactorThreshold;
    this.greenPremium = greenPremium;
    if (carbonTaxRate !== undefined) this.carbonTaxRate = carbonTaxRate;
    if (efficiencyRebateRate !== undefined) this.efficiencyRebateRate = efficiencyRebateRate;
    this.validFrom = validFrom;
    this.validTo = validTo;
    this.billingCycleDay = billingCycleDay;
    this.status = status;
    this.tags = { ...tags };
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.assertIdentity();
  }

  static fromDTO(dto: TariffDTO): TariffEntity {
    return new TariffEntity(
      dto.id,
      dto.orgId,
      dto.branchId,
      dto.buildingId,
      dto.providerName,
      dto.contractId,
      dto.serviceType,
      dto.pricingModel,
      dto.currency,
      dto.baseRate,
      dto.expectedAverageRate,
      dto.demandChargeRate,
      dto.demandChargeUnit,
      dto.fixedMonthlyFee,
      dto.taxPercentage,
      dto.touScheduleId,
      dto.peakRate,
      dto.valleyRate,
      dto.shoulderRate,
      dto.season,
      dto.tieredRates,
      dto.fuelAdjustmentFactor,
      dto.indexReferenceId,
      dto.indexAdjustmentFormula,
      dto.volatilityIndex,
      dto.reactiveEnergyCharge,
      dto.powerFactorThreshold,
      dto.greenPremium,
      dto.carbonTaxRate,
      dto.efficiencyRebateRate,
      dto.validFrom,
      dto.validTo,
      dto.billingCycleDay,
      dto.status,
      dto.tags,
      dto.createdAt,
      dto.updatedAt
    );
  }

  assertIdentity(): void {
    if (!this.id?.trim()) throw new SmsDomainError('Tariff.id required');
    if (!this.orgId?.trim()) throw new SmsDomainError('Tariff.orgId required');
    if (!this.branchId?.trim()) throw new SmsDomainError('Tariff.branchId required');
    if (!this.providerName?.trim()) throw new SmsDomainError('Tariff.providerName required');
    if (!this.contractId?.trim()) throw new SmsDomainError('Tariff.contractId required');
    if (this.baseRate < 0 || !Number.isFinite(this.baseRate)) {
      throw new SmsDomainError('Tariff.baseRate invalid');
    }
    if (this.taxPercentage < 0 || this.taxPercentage > 1 || !Number.isFinite(this.taxPercentage)) {
      throw new SmsDomainError('Tariff.taxPercentage invalid');
    }
    if (
      this.volatilityIndex < 0 ||
      this.volatilityIndex > 1 ||
      !Number.isFinite(this.volatilityIndex)
    ) {
      throw new SmsDomainError('Tariff.volatilityIndex invalid');
    }
    if (
      this.powerFactorThreshold < 0 ||
      this.powerFactorThreshold > 1 ||
      !Number.isFinite(this.powerFactorThreshold)
    ) {
      throw new SmsDomainError('Tariff.powerFactorThreshold invalid');
    }
    if (this.greenPremium < 0 || !Number.isFinite(this.greenPremium)) {
      throw new SmsDomainError('Tariff.greenPremium invalid');
    }
    if (this.billingCycleDay < 1 || this.billingCycleDay > 31) {
      throw new SmsDomainError('Tariff.billingCycleDay invalid');
    }
    if (!(this.fuelAdjustmentFactor > 0) || !Number.isFinite(this.fuelAdjustmentFactor)) {
      throw new SmsDomainError('Tariff.fuelAdjustmentFactor invalid');
    }
    if (this.validTo < this.validFrom) {
      throw new SmsDomainError('Tariff.validTo must be >= validFrom');
    }
    if (
      Array.isArray(this.tieredRates) &&
      this.tieredRates.some(
        (t) => !(t.rate >= 0) || !(t.limit >= 0) || !Number.isFinite(t.rate) || !Number.isFinite(t.limit)
      )
    ) {
      throw new SmsDomainError('Tariff.tieredRates invalid');
    }
  }

  toValue(): TariffDTO {
    return new TariffDTO(
      this.id,
      this.orgId,
      this.branchId,
      this.buildingId,
      this.serviceType,
      this.providerName,
      this.contractId,
      this.pricingModel,
      this.currency,
      this.baseRate,
      this.expectedAverageRate,
      this.demandChargeRate,
      this.demandChargeUnit,
      this.fixedMonthlyFee,
      this.taxPercentage,
      this.touScheduleId,
      this.peakRate,
      this.valleyRate,
      this.shoulderRate,
      this.season,
      this.tieredRates,
      this.fuelAdjustmentFactor,
      this.indexReferenceId,
      this.indexAdjustmentFormula,
      this.volatilityIndex,
      this.reactiveEnergyCharge,
      this.powerFactorThreshold,
      this.greenPremium,
      this.carbonTaxRate,
      this.efficiencyRebateRate,
      this.validFrom,
      this.validTo,
      this.billingCycleDay,
      this.status,
      this.tags,
      this.createdAt,
      this.updatedAt
    );
  }
}
