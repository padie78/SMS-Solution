import { ValidationError } from "./errors.js";

/**
 * Extracts invoice SK from the object key.
 * Expected filename: INV#...__something.pdf
 * @param {string} key
 * @returns {string}
 */
export function extractSkFromS3Key(key) {
  const fileName = String(key).split("/").pop() || "";
  const sk = fileName.split("__")[0];

  if (!sk || !sk.startsWith("INV#")) {
    throw new ValidationError(`Invalid or missing SK extracted from key. key=${String(key)}`);
  }

  return sk;
}

