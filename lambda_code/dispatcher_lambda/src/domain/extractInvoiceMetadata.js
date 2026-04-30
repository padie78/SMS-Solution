import { ValidationError } from "./errors.js";

/**
 * Decodes S3 Key and extracts the internal Invoice ID (SK).
 * Expected format: uploads/userId/INV#UUID__filename.pdf
 * @param {string} rawKey
 * @returns {{ sk: string, key: string }}
 */
export function extractInvoiceMetadata(rawKey) {
  const key = decodeURIComponent(String(rawKey).replace(/\+/g, " "));
  const fileName = key.split("/").pop();

  if (!fileName || !fileName.includes("__")) {
    throw new ValidationError(`Protocol Violation: Separator '__' not found in key: ${key}`);
  }

  const sk = fileName.split("__")[0];
  if (!sk.startsWith("INV#")) {
    throw new ValidationError(`Format Error: Extracted ID "${sk}" does not start with "INV#"`);
  }

  return { sk, key };
}

