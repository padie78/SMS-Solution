/**
 * Generates a consistent S3 Key for invoice uploads.
 * Pattern: uploads/{userId}/{invoiceId}__{fileName}
 * * @param {string} userId - The unique identifier of the user (e.g., from Cognito).
 * @param {string} invoiceId - The internal ID generated for the invoice (SK).
 * @param {string} fileName - The original name of the file.
 * @returns {string} The sanitized S3 Key.
 */
export const formatObjectKey = (userId, invoiceId, fileName) => {
    // 1. Fallback for missing filenames
    if (!fileName) {
        return `uploads/${userId}/${invoiceId}__unnamed_file_${Date.now()}`;
    }

    // 2. Sanitation logic:
    // - Replace spaces with underscores
    // - Remove any character that isn't a letter, number, dot, dash, or underscore
    // - Convert to lowercase for S3 consistency
    const cleanFileName = fileName
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9._-]/g, '')
        .toLowerCase();

    // 3. Return the structured path
    return `uploads/${userId}/${invoiceId}__${cleanFileName}`;
};