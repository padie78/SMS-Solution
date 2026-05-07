import { z } from 'zod';
import { SmsIdSchema } from '../shared/sms-id.schema.js';
import { MeterTypeSchema } from '../shared/domain-enums.js';
import { MeterOperationalStatusSchema, MeterProtocolSchema } from '../shared/graphql-setup-enums.js';

export const MeterDTOSchema = z.object({
  id: SmsIdSchema,
  orgId: SmsIdSchema,
  regionId: SmsIdSchema,
  branchId: SmsIdSchema,
  buildingId: SmsIdSchema,
  meterType: MeterTypeSchema,
  serialNumber: z.string().min(1),
  name: z.string().min(1),
  iotName: z.string().min(1),
  protocol: MeterProtocolSchema,
  isMain: z.boolean().default(false),
  assetId: SmsIdSchema.optional(),
  parentMeterId: SmsIdSchema.optional(),
  status: MeterOperationalStatusSchema,
  createdAt: z.string().min(1).optional(),
  updatedAt: z.string().min(1).optional()
});

export type MeterDTO = z.infer<typeof MeterDTOSchema>;

export const parseMeterDTO = (input: unknown): MeterDTO => MeterDTOSchema.parse(input);

export const safeParseMeterDTO = (input: unknown) => MeterDTOSchema.safeParse(input);
