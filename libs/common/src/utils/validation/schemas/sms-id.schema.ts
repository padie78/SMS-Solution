import { z } from 'zod';

/**
 * IDs SMS: UUID estándar o identificadores cortos legados (≥3 chars).
 */
export const SmsIdSchema = z.union([z.string().uuid(), z.string().min(3)]);

export type SmsId = z.infer<typeof SmsIdSchema>;
