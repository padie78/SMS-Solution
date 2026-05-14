import { z } from 'zod';
/**
 * Argumentos AppSync para generar URL prefirmada de subida (invoice upload → S3).
 */
export declare const PresignedUploadUrlInputSchema: z.ZodObject<{
    invoiceId: z.ZodUnion<[z.ZodString, z.ZodString]>;
    fileName: z.ZodOptional<z.ZodString>;
    fileType: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    invoiceId: string;
    fileName?: string | undefined;
    fileType?: string | undefined;
}, {
    invoiceId: string;
    fileName?: string | undefined;
    fileType?: string | undefined;
}>;
export type PresignedUploadUrlInput = z.infer<typeof PresignedUploadUrlInputSchema>;
export declare function parsePresignedUploadUrlInput(input: unknown): PresignedUploadUrlInput;
export declare function safeParsePresignedUploadUrlInput(input: unknown): z.SafeParseReturnType<{
    invoiceId: string;
    fileName?: string | undefined;
    fileType?: string | undefined;
}, {
    invoiceId: string;
    fileName?: string | undefined;
    fileType?: string | undefined;
}>;
//# sourceMappingURL=presigned-upload.dto.d.ts.map