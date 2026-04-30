import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";

export class S3OrgResolverAws {
  /**
   * @param {{ s3?: S3Client }} deps
   */
  constructor(deps = {}) {
    this.s3 = deps.s3 || new S3Client({});
  }

  /**
   * @param {string} key
   * @returns {string | null}
   */
  getOrgIdFromPath(key) {
    const pathParts = String(key).split("/");
    const orgIdCandidate = pathParts.length > 1 ? pathParts[1] : null;

    if (orgIdCandidate && orgIdCandidate !== "uploads" && orgIdCandidate !== "") {
      return orgIdCandidate;
    }
    return null;
  }

  /**
   * @param {{ bucket: string, key: string }} params
   * @returns {Promise<string | null>}
   */
  async getOrgIdFromMetadata(params) {
    try {
      const head = await this.s3.send(
        new HeadObjectCommand({
          Bucket: params.bucket,
          Key: params.key
        })
      );
      return head.Metadata?.["organization-id"] || head.Metadata?.["organizationid"] || null;
    } catch (error) {
      const msg = error?.message ? String(error.message) : "Unknown error";
      console.error(`[S3_METADATA_ERROR] Failed to fetch HeadObject for ${params.key}: ${msg}`);
      return null;
    }
  }

  /**
   * @param {{ bucket: string, key: string, requestId: string }} params
   * @returns {Promise<string>}
   */
  async resolveOrgId(params) {
    console.log(`[CONTEXT] [${params.requestId}] Identifying organization context for S3 object: ${params.key}`);

    const orgIdFromPath = this.getOrgIdFromPath(params.key);
    if (orgIdFromPath) {
      console.log(`[CONTEXT_MATCH] [${params.requestId}] OrgId found via path: ${orgIdFromPath}`);
      return orgIdFromPath;
    }

    console.log(`[CONTEXT_FALLBACK] [${params.requestId}] Path analysis inconclusive. Checking S3 metadata...`);
    const orgIdFromMeta = await this.getOrgIdFromMetadata({ bucket: params.bucket, key: params.key });
    if (orgIdFromMeta) {
      console.log(`[CONTEXT_MATCH] [${params.requestId}] OrgId found via metadata: ${orgIdFromMeta}`);
      return orgIdFromMeta;
    }

    console.warn(`[CONTEXT_WARNING] [${params.requestId}] Unable to determine Organization ID. Defaulting to UNKNOWN_ORG.`);
    return "UNKNOWN_ORG";
  }
}

