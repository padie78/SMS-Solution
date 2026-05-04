import { z } from 'zod';
import { InvoiceSkSchema } from './invoice-sk.schema.js';

/** Resultado de parsear `uploads/…/<INV#…>__filename` tras decodeURIComponent. */
export const DecodedInvoiceUploadKeySchema = z.object({
  sk: InvoiceSkSchema,
  key: z.string().min(1)
});

export type DecodedInvoiceUploadKey = z.infer<typeof DecodedInvoiceUploadKeySchema>;

export function safeParseDecodedInvoiceUploadKey(input: unknown) {
  return DecodedInvoiceUploadKeySchema.safeParse(input);
}
