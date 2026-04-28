import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";

// Standard client instantiation for connection reuse
const s3 = new S3Client({});

/**
 * Attempts to extract the Organization ID from the S3 Object Key Path.
 * Pattern: uploads/{orgId}/filename.pdf
 */
const getOrgIdFromPath = (key) => {
    const pathParts = key.split('/');
    // Looking for the segment after 'uploads/'
    const orgIdCandidate = pathParts.length > 1 ? pathParts[1] : null;

    if (orgIdCandidate && orgIdCandidate !== 'uploads' && orgIdCandidate !== '') {
        return orgIdCandidate;
    }
    return null;
};

/**
 * Attempts to retrieve Organization ID from S3 Object Metadata.
 * Fallback when path-based identification fails.
 */
const getOrgIdFromMetadata = async (bucket, key) => {
    try {
        const head = await s3.send(new HeadObjectCommand({ 
            Bucket: bucket, 
            Key: key 
        }));

        // S3 metadata keys are always stored in lowercase
        return head.Metadata?.['organization-id'] || head.Metadata?.['organizationid'];
    } catch (error) {
        console.error(`[S3_METADATA_ERROR] Failed to fetch HeadObject for ${key}: ${error.message}`);
        return null;
    }
};

/**
 * Orchestrates the identification of the Organization ID for the given file.
 */
export const getOrganizationId = async (bucket, key) => {
    console.log(`[CONTEXT] Identifying organization context for S3 object: ${key}`);

    // Strategy 1: Path Analysis
    const orgIdFromPath = getOrgIdFromPath(key);
    if (orgIdFromPath) {
        console.log(`[CONTEXT_MATCH] OrgId found via path: ${orgIdFromPath}`);
        return orgIdFromPath;
    }

    // Strategy 2: Metadata Inspection (Fallback)
    console.log(`[CONTEXT_FALLBACK] Path analysis inconclusive. Checking S3 metadata...`);
    const orgIdFromMeta = await getOrgIdFromMetadata(bucket, key);
    
    if (orgIdFromMeta) {
        console.log(`[CONTEXT_MATCH] OrgId found via metadata: ${orgIdFromMeta}`);
        return orgIdFromMeta;
    }

    // Strategy 3: Default Fallback
    console.warn(`[CONTEXT_WARNING] Unable to determine Organization ID. Defaulting to UNKNOWN_ORG.`);
    return 'UNKNOWN_ORG';
};