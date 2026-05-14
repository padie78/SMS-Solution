import { z } from 'zod';
/** Resultado de parsear `uploads/…/<INV#…>__filename` tras decodeURIComponent. */
export declare const DecodedInvoiceUploadKeySchema: z.ZodObject<{
    sk: z.ZodString;
    key: z.ZodString;
}, "strip", z.ZodTypeAny, {
    sk: string;
    key: string;
}, {
    sk: string;
    key: string;
}>;
export type DecodedInvoiceUploadKey = z.infer<typeof DecodedInvoiceUploadKeySchema>;
export declare function safeParseDecodedInvoiceUploadKey(input: unknown): z.SafeParseReturnType<{
    sk: string;
    key: string;
}, {
    sk: string;
    key: string;
}>;
//# sourceMappingURL=decoded-upload-s3-key.dto.d.ts.map