import { z } from 'zod';
/**
 * IDs SMS: UUID estándar o identificadores cortos legados (≥3 chars).
 */
export declare const SmsIdSchema: z.ZodUnion<[z.ZodString, z.ZodString]>;
export type SmsId = z.infer<typeof SmsIdSchema>;
//# sourceMappingURL=sms-id.schema.d.ts.map