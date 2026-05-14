import { z } from 'zod';
/** Contexto mínimo tras primer record de un evento S3 → dispatcher. */
export declare const S3DispatcherInvokeSchema: z.ZodObject<{
    requestId: z.ZodString;
    bucket: z.ZodString;
    rawKey: z.ZodString;
}, "strip", z.ZodTypeAny, {
    bucket: string;
    requestId: string;
    rawKey: string;
}, {
    bucket: string;
    requestId: string;
    rawKey: string;
}>;
export type S3DispatcherInvoke = z.infer<typeof S3DispatcherInvokeSchema>;
export declare function parseS3DispatcherInvoke(input: unknown): S3DispatcherInvoke;
export declare function safeParseS3DispatcherInvoke(input: unknown): z.SafeParseReturnType<{
    bucket: string;
    requestId: string;
    rawKey: string;
}, {
    bucket: string;
    requestId: string;
    rawKey: string;
}>;
//# sourceMappingURL=s3-dispatcher-invoke.dto.d.ts.map