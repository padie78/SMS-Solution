import { InvoiceSkSchema } from "@sms/common";
import { formatZodIssues } from "@sms/shared";
import { ValidationError } from "./errors.js";

/**
 * Extrae invoice SK desde la clave S3 (`…/INV#…__file`).
 * Decodifica como el dispatcher (`INV%23…` → `INV#…`).
 * @param {string} key
 * @returns {import('@sms/common').InvoiceSk}
 */
export function extractSkFromS3Key(key) {
  const decoded = decodeURIComponent(String(key).replace(/\+/g, " "));
  const fileName = decoded.split("/").pop() || "";
  const candidate = fileName.split("__")[0];

  const parsed = InvoiceSkSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new ValidationError(
      `Invalid invoice SK in key: ${formatZodIssues(parsed.error)} key=${decoded}`
    );
  }

  return parsed.data;
}
