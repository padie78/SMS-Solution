import { z } from 'zod';
import { SmsIdSchema } from '../../schemas/sms-id.schema.js';
import { InvoiceSkSchema } from '../../schemas/invoice-sk.schema.js';
/** Respuesta del caso de uso dispatcher tras encolar el worker. */
export const DispatcherEnqueueResultSchema = z.object({
    status: z.literal('ENQUEUED'),
    invoiceId: InvoiceSkSchema,
    orgId: SmsIdSchema,
    key: z.string().min(1)
});
export function parseDispatcherEnqueueResult(input) {
    return DispatcherEnqueueResultSchema.parse(input);
}
//# sourceMappingURL=dispatcher-enqueue-result.dto.js.map