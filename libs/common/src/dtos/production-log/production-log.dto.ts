import { z } from 'zod';
import { ProductionShiftModeSchema, ProductionUnitTypeSchema } from '../shared/graphql-setup-enums.js';

export const ProductionLogDTOSchema = z.object({
  units: z.number().nonnegative(),
  unitType: ProductionUnitTypeSchema,
  shiftMode: ProductionShiftModeSchema,
  efficiency: z.number().min(0).max(100),
  activeLines: z.number().int().nonnegative()
});

export type ProductionLogDTO = z.infer<typeof ProductionLogDTOSchema>;

export const parseProductionLogDTO = (input: unknown): ProductionLogDTO =>
  ProductionLogDTOSchema.parse(input);

export const safeParseProductionLogDTO = (input: unknown) =>
  ProductionLogDTOSchema.safeParse(input);
