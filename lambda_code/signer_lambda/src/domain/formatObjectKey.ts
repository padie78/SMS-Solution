/**
 * Generates a consistent S3 Key for invoice uploads.
 * Pattern: uploads/{userId}/{invoiceId}__{fileName}
 */
export function formatObjectKey(userId: string, invoiceId: string, fileName?: string | null): string {
  if (!fileName) {
    return `uploads/${userId}/${invoiceId}__unnamed_file_${Date.now()}`;
  }

  const cleanFileName = fileName
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();

  return `uploads/${userId}/${invoiceId}__${cleanFileName}`;
}

