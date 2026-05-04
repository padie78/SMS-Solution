import { z } from 'zod';

/**
 * DynamoDB SK + prefijo en claves S3 (`…/INV#<id>__file.pdf`).
 */
export const InvoiceSkSchema = z
  .string()
  .min(5)
  .regex(/^INV#[^\s/]+$/, 'Invoice SK must be INV#<id> with no slashes or whitespace');

export type InvoiceSk = z.infer<typeof InvoiceSkSchema>;
