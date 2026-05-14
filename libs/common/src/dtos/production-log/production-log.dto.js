import { z } from 'zod';
import { ProductionShiftModeSchema, ProductionUnitTypeSchema } from '../shared/graphql-setup-enums.js';     
export const ProductionLogDTOSchema = z.object({
    units: z.number().nonnegative(),
    unitType: ProductionUnitTypeSchema,
    shiftMode: ProductionShiftModeSchema,
    efficiency: z.number().min(0).max(100),
    activeLines: z.number().int().nonnegative()
});
export const parseProductionLogDTO = (input) => ProductionLogDTOSchema.parse(input);
export const safeParseProductionLogDTO = (input) => ProductionLogDTOSchema.safeParse(input);
//# sourceMappingURL=production-log.dto.js.map