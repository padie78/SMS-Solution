import { z } from 'zod';
import { SmsIdSchema } from '../shared/sms-id.schema.js';

export const RegionDTOSchema = z.object({
  id: SmsIdSchema,
  name: z.string().min(1),
  code: z.string().min(1).optional()
});

export type RegionDTO = z.infer<typeof RegionDTOSchema>;

export const parseRegionDTO = (input: unknown): RegionDTO => RegionDTOSchema.parse(input);

export const safeParseRegionDTO = (input: unknown) => RegionDTOSchema.safeParse(input);
