import { z } from 'zod';

/** Contexto mínimo tras primer record de un evento S3 → dispatcher. */
export const S3DispatcherInvokeSchema = z.object({
  requestId: z.string().min(1),
  bucket: z.string().min(1),
  rawKey: z.string().min(1)
});

export type S3DispatcherInvoke = z.infer<typeof S3DispatcherInvokeSchema>;

export function parseS3DispatcherInvoke(input: unknown): S3DispatcherInvoke {
  return S3DispatcherInvokeSchema.parse(input);
}

export function safeParseS3DispatcherInvoke(input: unknown) {
  return S3DispatcherInvokeSchema.safeParse(input);
}
