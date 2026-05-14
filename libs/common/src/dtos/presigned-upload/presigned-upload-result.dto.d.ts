import { z } from 'zod';
/** Payload devuelto por la mutation AppSync / caso de uso de URL prefirmada. */
export declare const PresignedUploadUrlResultSchema: z.ZodObject<{
    uploadURL: z.ZodString;
    key: z.ZodString;
    userId: z.ZodString;
    invoiceId: z.ZodString;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    message: string;
    invoiceId: string;
    uploadURL: string;
    key: string;
    userId: string;
}, {
    message: string;
    invoiceId: string;
    uploadURL: string;
    key: string;
    userId: string;
}>;
export type PresignedUploadUrlResult = z.infer<typeof PresignedUploadUrlResultSchema>;
export declare function parsePresignedUploadUrlResult(input: unknown): PresignedUploadUrlResult;
//# sourceMappingURL=presigned-upload-result.dto.d.ts.map