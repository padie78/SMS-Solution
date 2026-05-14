import { z } from 'zod';
/**
 * DynamoDB SK + prefijo en claves S3 (`…/INV#<id>__file.pdf`).
 */
export declare const InvoiceSkSchema: z.ZodString;
export type InvoiceSk = z.infer<typeof InvoiceSkSchema>;
//# sourceMappingURL=invoice-sk.schema.d.ts.map