/**
 * Generates a consistent S3 Key for invoice uploads.
 * Pattern: uploads/{userId}/{invoiceId}__{fileName}
 * @param {string} userId
 * @param {string} invoiceId
 * @param {string=} fileName
 * @returns {string}
 */
export function formatObjectKey(userId, invoiceId, fileName) {
  if (!fileName) {
    return `uploads/${userId}/${invoiceId}__unnamed_file_${Date.now()}`;
  }

  const cleanFileName = fileName
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();

  return `uploads/${userId}/${invoiceId}__${cleanFileName}`;
}

