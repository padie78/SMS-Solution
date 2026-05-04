import { z } from 'zod';
import { SmsIdSchema } from '../shared/sms-id.schema.js';
import { CostAllocationMethodSchema } from '../shared/graphql-setup-enums.js';

export const CostCenterDTOSchema = z
  .object({
    id: SmsIdSchema,
    name: z.string().min(1),
    branchId: SmsIdSchema.optional(),
    buildingId: SmsIdSchema.optional(),
    /** Método de prorrateo (p. ej. `SQUARE_METERS` desde AppSync). */
    allocationMethod: z.union([CostAllocationMethodSchema, z.string().min(1)]).optional(),
    percentage: z.number().min(0).max(100).optional(),
    annualBudget: z.number().nonnegative().optional()
  })
  .superRefine((data, ctx) => {
    if (!data.branchId && !data.buildingId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CostCenter requires branchId and/or buildingId for financial traceability'
      });
    }
  });

export type CostCenterDTO = z.infer<typeof CostCenterDTOSchema>;

export const parseCostCenterDTO = (input: unknown): CostCenterDTO =>
  CostCenterDTOSchema.parse(input);

export const safeParseCostCenterDTO = (input: unknown) => CostCenterDTOSchema.safeParse(input);
