import { z } from 'zod';
import { SmsIdSchema } from '../shared/sms-id.schema.js';
import { CostAllocationMethodSchema, LifecycleStatusSchema } from '../shared/graphql-setup-enums.js';

export const CostCenterDTOSchema = z.object({
  id: SmsIdSchema,
  organizationId: SmsIdSchema,
  name: z.string().min(1),
  branchId: SmsIdSchema.optional(),
  buildingId: SmsIdSchema.optional(),
  annualBudget: z.number().nonnegative(),
  currency: z.string().min(1).default('ILS'),
  fiscalYear: z.number().int().default(() => new Date().getFullYear()),
  allocationMethod: CostAllocationMethodSchema,
  percentage: z.number().min(0).max(100).default(100),
  externalId: z.string().min(1).optional(),
  status: LifecycleStatusSchema,
  updatedAt: z.string().min(1).optional()
});

export type CostCenterDTO = z.infer<typeof CostCenterDTOSchema>;

export const parseCostCenterDTO = (input: unknown): CostCenterDTO =>
  CostCenterDTOSchema.parse(input);

export const safeParseCostCenterDTO = (input: unknown) => CostCenterDTOSchema.safeParse(input);
