import { z } from 'zod';

import type { S3DispatcherInvokeDto } from '@sms/application';

export const S3DispatcherInvokeSchema = z.object({
  requestId: z.string().min(1),
  bucket: z.string().min(1),
  rawKey: z.string().min(1)
});

export function parseS3DispatcherInvoke(input: unknown): S3DispatcherInvokeDto {
  return S3DispatcherInvokeSchema.parse(input) as S3DispatcherInvokeDto;
}

export function safeParseS3DispatcherInvoke(input: unknown) {
  return S3DispatcherInvokeSchema.safeParse(input);
}
