import { z } from 'zod';
/** Payload devuelto por la mutation AppSync / caso de uso de URL prefirmada. */
export const PresignedUploadUrlResultSchema = z.object({
    uploadURL: z.string().min(1),
    key: z.string().min(1),
    userId: z.string().min(1),
    invoiceId: z.string().min(1),
    message: z.string().min(1)
});
export function parsePresignedUploadUrlResult(input) {
    return PresignedUploadUrlResultSchema.parse(input);
}
//# sourceMappingURL=presigned-upload-result.dto.js.map