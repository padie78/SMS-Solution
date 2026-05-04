import { z } from 'zod';
import { SmsIdSchema } from '../shared/sms-id.schema.js';
import { MeterTypeSchema } from '../shared/domain-enums.js';
import { MeterProtocolSchema } from '../shared/graphql-setup-enums.js';

export const MeterDTOSchema = z
  .object({
    id: SmsIdSchema,
    buildingId: SmsIdSchema,
    branchId: SmsIdSchema.optional(),
    meterType: MeterTypeSchema,
    assetId: SmsIdSchema.optional(),
    serialNumber: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    iotName: z.string().min(1).optional(),
    protocol: MeterProtocolSchema.optional(),
    isMain: z.boolean().optional()
  })
  .superRefine((data, ctx) => {
    if (!data.buildingId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Meter requires buildingId'
      });
    }
  });

export type MeterDTO = z.infer<typeof MeterDTOSchema>;

export const parseMeterDTO = (input: unknown): MeterDTO => MeterDTOSchema.parse(input);

export const safeParseMeterDTO = (input: unknown) => MeterDTOSchema.safeParse(input);
