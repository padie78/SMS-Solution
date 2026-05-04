import { safeParseDecodedInvoiceUploadKey } from "@sms/common";
import { ValidationError } from "./errors.js";
import { formatZodIssues } from "@sms/shared";

/**
 * Decodes S3 Key and extracts the internal Invoice ID (SK).
 * Expected format: uploads/userId/INV#UUID__filename.pdf
 * @param {string} rawKey
 * @returns {import('@sms/common').DecodedInvoiceUploadKey}
 */
export function extractInvoiceMetadata(rawKey) {
  const key = decodeURIComponent(String(rawKey).replace(/\+/g, " "));
  const fileName = key.split("/").pop();

  if (!fileName || !fileName.includes("__")) {
    throw new ValidationError(`Protocol Violation: Separator '__' not found in key: ${key}`);
  }

  const sk = fileName.split("__")[0];
  const validated = safeParseDecodedInvoiceUploadKey({ sk, key });
  if (!validated.success) {
    throw new ValidationError(`${formatZodIssues(validated.error)} key=${key}`);
  }

  return validated.data;
}

