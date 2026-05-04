import { z } from 'zod';
import { SmsIdSchema } from '../shared/sms-id.schema.js';

/**
 * Argumentos AppSync para generar URL prefirmada de subida (invoice upload → S3).
 */
export const PresignedUploadUrlInputSchema = z.object({
  invoiceId: SmsIdSchema,
  fileName: z.string().min(1).max(512).optional(),
  fileType: z.string().min(1).max(256).optional()
});

export type PresignedUploadUrlInput = z.infer<typeof PresignedUploadUrlInputSchema>;

export function parsePresignedUploadUrlInput(input: unknown): PresignedUploadUrlInput {
  return PresignedUploadUrlInputSchema.parse(input);
}

export function safeParsePresignedUploadUrlInput(input: unknown) {
  return PresignedUploadUrlInputSchema.safeParse(input);
}
