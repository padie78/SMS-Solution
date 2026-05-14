import { z } from 'zod';
import { SmsIdSchema } from '../../schemas/sms-id.schema.js';
/**
 * Argumentos AppSync para generar URL prefirmada de subida (invoice upload → S3).
 */
export const PresignedUploadUrlInputSchema = z.object({
    invoiceId: SmsIdSchema,
    fileName: z.string().min(1).max(512).optional(),
    fileType: z.string().min(1).max(256).optional()
});
export function parsePresignedUploadUrlInput(input) {
    return PresignedUploadUrlInputSchema.parse(input);
}
export function safeParsePresignedUploadUrlInput(input) {
    return PresignedUploadUrlInputSchema.safeParse(input);
}
//# sourceMappingURL=presigned-upload.dto.js.map