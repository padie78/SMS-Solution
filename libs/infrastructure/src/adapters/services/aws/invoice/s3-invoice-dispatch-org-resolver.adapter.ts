import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';

import type { InvoiceDispatchOrgResolverPort } from '@sms/application';

export type S3InvoiceDispatchOrgResolverAdapterOptions = {
  readonly s3?: S3Client;
};

/**
 * Resuelve `orgId` desde el path S3 (`uploads/<orgId>/…`) o metadata `organization-id`.
 */
export class S3InvoiceDispatchOrgResolverAdapter implements InvoiceDispatchOrgResolverPort {
  private readonly s3: S3Client;

  constructor(options: S3InvoiceDispatchOrgResolverAdapterOptions = {}) {
    this.s3 = options.s3 ?? new S3Client({});
  }

  getOrgIdFromPath(key: string): string | null {
    const pathParts = String(key).split('/');
    const orgIdCandidate = pathParts.length > 1 ? pathParts[1] : null;

    if (orgIdCandidate && orgIdCandidate !== 'uploads' && orgIdCandidate !== '') {
      return orgIdCandidate;
    }
    return null;
  }

  async getOrgIdFromMetadata(params: { bucket: string; key: string }): Promise<string | null> {
    try {
      const head = await this.s3.send(
        new HeadObjectCommand({
          Bucket: params.bucket,
          Key: params.key
        })
      );
      return head.Metadata?.['organization-id'] ?? head.Metadata?.['organizationid'] ?? null;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[S3_METADATA_ERROR] Failed to fetch HeadObject for ${params.key}: ${msg}`);
      return null;
    }
  }

  async resolveOrgId(params: { bucket: string; key: string; requestId: string }): Promise<string> {
    console.log(
      `[CONTEXT] [${params.requestId}] Identifying organization context for S3 object: ${params.key}`
    );

    const orgIdFromPath = this.getOrgIdFromPath(params.key);
    if (orgIdFromPath) {
      console.log(`[CONTEXT_MATCH] [${params.requestId}] OrgId found via path: ${orgIdFromPath}`);
      return orgIdFromPath;
    }

    console.log(
      `[CONTEXT_FALLBACK] [${params.requestId}] Path analysis inconclusive. Checking S3 metadata...`
    );
    const orgIdFromMeta = await this.getOrgIdFromMetadata({
      bucket: params.bucket,
      key: params.key
    });
    if (orgIdFromMeta) {
      console.log(`[CONTEXT_MATCH] [${params.requestId}] OrgId found via metadata: ${orgIdFromMeta}`);
      return orgIdFromMeta;
    }

    console.warn(
      `[CONTEXT_WARNING] [${params.requestId}] Unable to determine Organization ID. Defaulting to UNKNOWN_ORG.`
    );
    return 'UNKNOWN_ORG';
  }
}
