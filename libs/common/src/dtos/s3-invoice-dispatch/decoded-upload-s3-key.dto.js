import { z } from 'zod';
import { InvoiceSkSchema } from '../../schemas/invoice-sk.schema.js';
/** Resultado de parsear `uploads/…/<INV#…>__filename` tras decodeURIComponent. */
export const DecodedInvoiceUploadKeySchema = z.object({
    sk: InvoiceSkSchema,
    key: z.string().min(1)
});
export function safeParseDecodedInvoiceUploadKey(input) {
    return DecodedInvoiceUploadKeySchema.safeParse(input);
}
//# sourceMappingURL=decoded-upload-s3-key.dto.js.map