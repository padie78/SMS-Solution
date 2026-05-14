import { z } from 'zod';
import { SmsIdSchema } from '../../schemas/sms-id.schema.js';
import { InvoiceSkSchema } from '../../schemas/invoice-sk.schema.js';
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
export function parseInvoiceDispatchQueueMessage(input) {
    return InvoiceDispatchQueueMessageSchema.parse(input);
}
export function safeParseInvoiceDispatchQueueMessage(input) {
    return InvoiceDispatchQueueMessageSchema.safeParse(input);
}
//# sourceMappingURL=invoice-dispatch-queue-message.dto.js.map