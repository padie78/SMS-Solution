import { z } from 'zod';
/** Contexto mínimo tras primer record de un evento S3 → dispatcher. */
export const S3DispatcherInvokeSchema = z.object({
    requestId: z.string().min(1),
    bucket: z.string().min(1),
    rawKey: z.string().min(1)
});
export function parseS3DispatcherInvoke(input) {
    return S3DispatcherInvokeSchema.parse(input);
}
export function safeParseS3DispatcherInvoke(input) {
    return S3DispatcherInvokeSchema.safeParse(input);
}
//# sourceMappingURL=s3-dispatcher-invoke.dto.js.map