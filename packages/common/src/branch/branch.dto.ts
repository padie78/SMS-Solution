import { z } from 'zod';
import { SmsIdSchema } from '../shared/sms-id.schema.js';
import { AddressDTOSchema } from '../shared/address.dto.js';
import { FacilityTypeSchema, LifecycleStatusSchema } from '../shared/graphql-setup-enums.js';

export const BranchDTOSchema = z.object({
  id: SmsIdSchema,
  organizationId: SmsIdSchema,
  regionId: SmsIdSchema,
  name: z.string().min(1),
  timezone: z.string().min(1),
  m2Surface: z.number().nonnegative(),
  facilityType: FacilityTypeSchema,
  energyTarget: z.number().nonnegative().optional(),
  isHeadquarters: z.boolean().default(false),
  address: AddressDTOSchema.optional(),
  status: LifecycleStatusSchema,
  createdAt: z.string().min(1).optional(),
  updatedAt: z.string().min(1).optional()
});

export type BranchDTO = z.infer<typeof BranchDTOSchema>;

export const parseBranchDTO = (input: unknown): BranchDTO => BranchDTOSchema.parse(input);

export const safeParseBranchDTO = (input: unknown) => BranchDTOSchema.safeParse(input);
