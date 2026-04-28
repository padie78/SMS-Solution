/**
 * Decodes S3 Key and extracts the internal Invoice ID (SK).
 * Expected format: uploads/userId/INV#UUID__filename.pdf
 */
export const extractInvoiceMetadata = (rawKey) => {
    // 1. Decode URL encoding and replace '+' with spaces
    const key = decodeURIComponent(rawKey.replace(/\+/g, " "));
    
    // 2. Get the filename from the path
    const fileName = key.split('/').pop(); 
    
    // 3. Extract the SK (Part before '__')
    if (!fileName || !fileName.includes('__')) {
        throw new Error(`Protocol Violation: Separator '__' not found in key: ${key}`);
    }

    const sk = fileName.split('__')[0]; 

    // 4. Validate SK format
    if (!sk.startsWith('INV#')) {
        throw new Error(`Format Error: Extracted ID "${sk}" does not start with "INV#"`);
    }

    return { sk, key };
};