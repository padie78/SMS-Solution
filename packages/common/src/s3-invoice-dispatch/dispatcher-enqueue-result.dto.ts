import { z } from 'zod';
import { SmsIdSchema } from '../shared/sms-id.schema.js';
import { InvoiceSkSchema } from './invoice-sk.schema.js';

/** Respuesta del caso de uso dispatcher tras encolar el worker. */
export const DispatcherEnqueueResultSchema = z.object({
  status: z.literal('ENQUEUED'),
  invoiceId: InvoiceSkSchema,
  orgId: SmsIdSchema,
  key: z.string().min(1)
});

export type DispatcherEnqueueResult = z.infer<typeof DispatcherEnqueueResultSchema>;

export function parseDispatcherEnqueueResult(input: unknown): DispatcherEnqueueResult {
  return DispatcherEnqueueResultSchema.parse(input);
}
