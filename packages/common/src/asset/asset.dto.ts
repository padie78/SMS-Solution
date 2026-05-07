import { z } from 'zod';
import { SmsIdSchema } from '../shared/sms-id.schema.js';
import { AssetTypeSchema } from '../shared/domain-enums.js';
import { AssetLifecycleStatusSchema } from '../shared/graphql-setup-enums.js';

const tagsSchema = z.record(z.string(), z.string()).optional();

export const AssetDTOSchema = z.object({
  id: SmsIdSchema,
  organizationId: SmsIdSchema,
  regionId: SmsIdSchema,
  branchId: SmsIdSchema,
  buildingId: SmsIdSchema,
  costCenterId: SmsIdSchema,
  name: z.string().min(1),
  type: AssetTypeSchema,
  status: AssetLifecycleStatusSchema,
  nominalPower: z.number().nonnegative().optional(),
  meterId: SmsIdSchema.optional(),
  tags: tagsSchema,
  createdAt: z.string().min(1).optional(),
  updatedAt: z.string().min(1).optional()
});

export type AssetDTO = z.infer<typeof AssetDTOSchema>;

export const parseAssetDTO = (input: unknown): AssetDTO => AssetDTOSchema.parse(input);

export const safeParseAssetDTO = (input: unknown) => AssetDTOSchema.safeParse(input);
