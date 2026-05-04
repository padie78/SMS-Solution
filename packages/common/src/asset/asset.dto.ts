import { z } from 'zod';
import { SmsIdSchema } from '../shared/sms-id.schema.js';
import { AssetTypeSchema } from '../shared/domain-enums.js';
export const AssetOperationalStatusSchema = z.enum([
  'OPERATIONAL',
  'MAINTENANCE',
  'DECOMMISSIONED'
]);

export const AssetDTOSchema = z.object({
  id: SmsIdSchema,
  buildingId: SmsIdSchema,
  costCenterId: SmsIdSchema,
  branchId: SmsIdSchema.optional(),
  meterId: SmsIdSchema.optional(),
  type: AssetTypeSchema,
  name: z.string().min(1).optional(),
  status: AssetOperationalStatusSchema.optional(),
  nominalPower: z.number().nonnegative().optional()
});

export type AssetDTO = z.infer<typeof AssetDTOSchema>;

export const parseAssetDTO = (input: unknown): AssetDTO => AssetDTOSchema.parse(input);

export const safeParseAssetDTO = (input: unknown) => AssetDTOSchema.safeParse(input);
