import { z } from 'zod';
import { SmsIdSchema } from '../shared/sms-id.schema.js';

export const InvoiceDTOSchema = z.object({
  amount: z.number().finite(),
  kwhConsumption: z.number().finite().nonnegative(),
  facilityId: SmsIdSchema,
  billingPeriod: z
    .string()
    .min(1)
    .refine((s) => !Number.isNaN(Date.parse(s)), {
      message: 'billingPeriod must be a parseable ISO 8601 datetime string'
    })
});

export type InvoiceDTO = z.infer<typeof InvoiceDTOSchema>;

export const parseInvoiceDTO = (input: unknown): InvoiceDTO => InvoiceDTOSchema.parse(input);

export const safeParseInvoiceDTO = (input: unknown) => InvoiceDTOSchema.safeParse(input);
