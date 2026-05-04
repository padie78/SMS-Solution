import { z } from 'zod';
import { SmsIdSchema } from '../shared/sms-id.schema.js';
import { InvoiceSkSchema } from './invoice-sk.schema.js';

/** Cuerpo JSON enviado a SQS por el dispatcher (`PENDING_WORKER`). */
export const InvoiceDispatchQueueMessageSchema = z.object({
  bucket: z.string().min(1),
  key: z.string().min(1),
  orgId: SmsIdSchema,
  sk: InvoiceSkSchema,
  timestamp: z
    .string()
    .min(1)
    .refine((s) => !Number.isNaN(Date.parse(s)), {
      message: 'timestamp must be ISO-parseable'
    }),
  status: z.literal('PENDING_WORKER')
});

export type InvoiceDispatchQueueMessage = z.infer<typeof InvoiceDispatchQueueMessageSchema>;

export function parseInvoiceDispatchQueueMessage(input: unknown): InvoiceDispatchQueueMessage {
  return InvoiceDispatchQueueMessageSchema.parse(input);
}

export function safeParseInvoiceDispatchQueueMessage(input: unknown) {
  return InvoiceDispatchQueueMessageSchema.safeParse(input);
}
