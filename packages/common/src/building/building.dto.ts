import { z } from 'zod';
import { SmsIdSchema } from '../shared/sms-id.schema.js';
import {
  BuildingUsageTypeSchema,
  HvacTypeSchema,
  OperationalStatusSchema
} from '../shared/graphql-setup-enums.js';

export const BuildingDTOSchema = z.object({
  id: SmsIdSchema,
  branchId: SmsIdSchema,
  name: z.string().min(1),
  /** Compat: texto libre; si se informa enum del script, usar `usageTypeEnum`. */
  usageType: z.string().min(1).optional(),
  usageTypeEnum: BuildingUsageTypeSchema.optional(),
  status: OperationalStatusSchema.optional(),
  yearBuilt: z.number().int().positive().optional(),
  m2Surface: z.number().nonnegative().optional(),
  m3Volume: z.number().nonnegative().optional(),
  hvacType: HvacTypeSchema.optional(),
  hasBms: z.boolean().optional()
});

export type BuildingDTO = z.infer<typeof BuildingDTOSchema>;

export const parseBuildingDTO = (input: unknown): BuildingDTO => BuildingDTOSchema.parse(input);

export const safeParseBuildingDTO = (input: unknown) => BuildingDTOSchema.safeParse(input);
