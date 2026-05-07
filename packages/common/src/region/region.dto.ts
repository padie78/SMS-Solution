import { z } from 'zod';
import { SmsIdSchema } from '../shared/sms-id.schema.js';
import { GeoCoordinatesDTOSchema } from '../shared/geo.dto.js';
import { LifecycleStatusSchema } from '../shared/graphql-setup-enums.js';

export const RegionDTOSchema = z.object({
  id: SmsIdSchema,
  organizationId: SmsIdSchema,
  name: z.string().min(1),
  code: z.string().min(1),
  countryCode: z.string().min(2).max(3),
  timezone: z.string().min(1),
  status: LifecycleStatusSchema,
  description: z.string().min(1).optional(),
  coordinates: GeoCoordinatesDTOSchema.optional(),
  createdAt: z.string().min(1).optional(),
  updatedAt: z.string().min(1).optional()
});

export type RegionDTO = z.infer<typeof RegionDTOSchema>;

export const parseRegionDTO = (input: unknown): RegionDTO => RegionDTOSchema.parse(input);

export const safeParseRegionDTO = (input: unknown) => RegionDTOSchema.safeParse(input);
