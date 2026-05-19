import { z } from 'zod';
import { SmsIdSchema } from '../../validation/schemas/sms-id.schema.js';
import { CostAllocationMethodSchema, LifecycleStatusSchema } from '../shared/graphql-setup-enums.js';

export const CostCenterTypeSchema = z.enum(['DEPARTMENT', 'PROJECT', 'SERVICE', 'OPERATIONAL_UNIT']);

export type CostCenterType = z.infer<typeof CostCenterTypeSchema>;

export const CostCenterForecastModelSchema = z.enum([
  'LINEAR',
  'ML_PROPHET',
  'ARIMA',
  'STRICT_BUDGET'
]);

export type CostCenterForecastModel = z.infer<typeof CostCenterForecastModelSchema>;

const tagsSchema = z.record(z.string(), z.string()).default({});

const isoLike = z.string().min(4).max(40).optional();

export const CostCenterDTOSchema = z.object({
  id: SmsIdSchema,
  organizationId: SmsIdSchema,
  name: z.string().min(1),
  externalId: z.string().min(1).optional(),

  parentId: SmsIdSchema.optional(),
  branchId: SmsIdSchema.optional(),
  buildingId: SmsIdSchema.optional(),

  annualBudget: z.number().nonnegative(),
  currency: z.string().min(1).max(8).default('ILS'),
  budgetThresholdAlert: z.number().min(0).max(1).default(0.85),
  carbonBudgetTons: z.number().nonnegative().optional(),
  carbonShadowPrice: z.number().nonnegative().optional(),
  budgetSensitivityIndex: z.number().min(0).max(1).default(0.5),
  fiscalYear: z.number().int().min(1900).max(9999).default(() => new Date().getFullYear()),

  headcount: z.number().int().nonnegative().optional(),
  floorAreaSqm: z.number().nonnegative().optional(),
  productionUnitName: z.string().min(1).optional(),
  targetIntensity: z.number().nonnegative().optional(),
  /** % meta renovable objetivo (0–100). */
  renewableEnergyTarget: z.number().min(0).max(100).default(0),

  allocationMethod: CostAllocationMethodSchema,
  percentage: z.number().min(0).max(100).default(100),
  iscommon: z.boolean().default(false),
  allocationLastReviewDate: isoLike,
  approvedBy: z.string().min(1).optional(),

  type: CostCenterTypeSchema,
  forecastModel: CostCenterForecastModelSchema,
  managerEmail: z.string().min(3).optional(),
  operatingHoursId: z.string().min(1).optional(),
  status: LifecycleStatusSchema,

  tags: tagsSchema,
  createdAt: z.string().min(1).optional(),
  updatedAt: z.string().min(1).optional()
});

export class CostCenterDTO {
  public readonly id: string;
  public readonly organizationId: string;
  public readonly name: string;
  public readonly externalId?: string;
  public readonly parentId?: string;
  public readonly branchId?: string;
  public readonly buildingId?: string;
  public readonly annualBudget: number;
  public readonly currency: string;
  public readonly budgetThresholdAlert: number;
  public readonly carbonBudgetTons?: number;
  public readonly carbonShadowPrice?: number;
  public readonly budgetSensitivityIndex: number;
  public readonly fiscalYear: number;
  public readonly headcount?: number;
  public readonly floorAreaSqm?: number;
  public readonly productionUnitName?: string;
  public readonly targetIntensity?: number;
  public readonly renewableEnergyTarget: number;
  public readonly allocationMethod: z.infer<typeof CostAllocationMethodSchema>;
  public readonly percentage: number;
  public readonly iscommon: boolean;
  public readonly allocationLastReviewDate?: string;
  public readonly approvedBy?: string;
  public readonly type: z.infer<typeof CostCenterTypeSchema>;
  public readonly forecastModel: z.infer<typeof CostCenterForecastModelSchema>;
  public readonly managerEmail?: string;
  public readonly operatingHoursId?: string;
  public readonly status: z.infer<typeof LifecycleStatusSchema>;
  public readonly tags: Record<string, string>;
  public readonly createdAt?: string;
  public readonly updatedAt?: string;

  constructor(
    id: string,
    organizationId: string,
    name: string,
    externalId: string | null | undefined,
    parentId: string | null | undefined,
    branchId: string | null | undefined,
    buildingId: string | null | undefined,
    annualBudget: number,
    currency: string | null | undefined,
    budgetThresholdAlert: number | null | undefined,
    carbonBudgetTons: number | null | undefined,
    carbonShadowPrice: number | null | undefined,
    budgetSensitivityIndex: number | null | undefined,
    fiscalYear: number | null | undefined,
    headcount: number | null | undefined,
    floorAreaSqm: number | null | undefined,
    productionUnitName: string | null | undefined,
    targetIntensity: number | null | undefined,
    renewableEnergyTarget: number | null | undefined,
    allocationMethod: z.infer<typeof CostAllocationMethodSchema>,
    percentage: number | null | undefined,
    iscommon: boolean | null | undefined,
    allocationLastReviewDate: string | null | undefined,
    approvedBy: string | null | undefined,
    type: z.infer<typeof CostCenterTypeSchema>,
    forecastModel: z.infer<typeof CostCenterForecastModelSchema>,
    managerEmail: string | null | undefined,
    operatingHoursId: string | null | undefined,
    status: z.infer<typeof LifecycleStatusSchema>,
    tags: Record<string, string> | null | undefined,
    createdAt?: string,
    updatedAt?: string
  ) {
    this.id = id;
    this.organizationId = organizationId;
    this.name = name;
    if (externalId?.trim()) this.externalId = externalId.trim();
    if (parentId?.trim()) this.parentId = parentId.trim();
    if (branchId?.trim()) this.branchId = branchId.trim();
    if (buildingId?.trim()) this.buildingId = buildingId.trim();
    this.annualBudget = annualBudget;
    const c = currency?.trim() ? currency.trim().toUpperCase().slice(0, 8) : 'ILS';
    this.currency = c.length > 0 ? c : 'ILS';
    this.budgetThresholdAlert = budgetThresholdAlert ?? 0.85;
    if (carbonBudgetTons !== null && carbonBudgetTons !== undefined) this.carbonBudgetTons = carbonBudgetTons;
    if (carbonShadowPrice !== null && carbonShadowPrice !== undefined) this.carbonShadowPrice = carbonShadowPrice;
    this.budgetSensitivityIndex = budgetSensitivityIndex ?? 0.5;
    this.fiscalYear = fiscalYear ?? new Date().getFullYear();
    if (headcount !== null && headcount !== undefined) this.headcount = headcount;
    if (floorAreaSqm !== null && floorAreaSqm !== undefined) this.floorAreaSqm = floorAreaSqm;
    if (productionUnitName?.trim()) this.productionUnitName = productionUnitName.trim();
    if (targetIntensity !== null && targetIntensity !== undefined) this.targetIntensity = targetIntensity;
    this.renewableEnergyTarget = renewableEnergyTarget ?? 0;
    this.allocationMethod = allocationMethod;
    this.percentage = percentage ?? 100;
    this.iscommon = iscommon ?? false;
    if (allocationLastReviewDate?.trim())
      this.allocationLastReviewDate = allocationLastReviewDate.trim();
    if (approvedBy?.trim()) this.approvedBy = approvedBy.trim();
    this.type = type;
    this.forecastModel = forecastModel;
    if (managerEmail?.trim()) this.managerEmail = managerEmail.trim().toLowerCase();
    if (operatingHoursId?.trim()) this.operatingHoursId = operatingHoursId.trim();
    this.status = status;
    this.tags = typeof tags === 'object' && tags !== null ? { ...tags } : {};
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

export type CostCenterDTOInput = z.infer<typeof CostCenterDTOSchema>;

export const parseCostCenterDTO = (input: unknown): CostCenterDTO => {
  const d = CostCenterDTOSchema.parse(input);
  return new CostCenterDTO(
    d.id,
    d.organizationId,
    d.name,
    d.externalId,
    d.parentId,
    d.branchId,
    d.buildingId,
    d.annualBudget,
    d.currency,
    d.budgetThresholdAlert,
    d.carbonBudgetTons,
    d.carbonShadowPrice,
    d.budgetSensitivityIndex,
    d.fiscalYear,
    d.headcount,
    d.floorAreaSqm,
    d.productionUnitName,
    d.targetIntensity,
    d.renewableEnergyTarget,
    d.allocationMethod,
    d.percentage,
    d.iscommon,
    d.allocationLastReviewDate,
    d.approvedBy,
    d.type,
    d.forecastModel,
    d.managerEmail,
    d.operatingHoursId,
    d.status,
    d.tags,
    d.createdAt,
    d.updatedAt
  );
};

export const safeParseCostCenterDTO = (input: unknown) => CostCenterDTOSchema.safeParse(input);
