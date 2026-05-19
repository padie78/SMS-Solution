/**
 * S3 wrapper: presigned URLs, object metadata. Implement with `@aws-sdk/client-s3`.
 */
export interface S3AdapterConfig {
  readonly bucket: string;
  readonly region: string;
}

export interface PresignedPutUrlInput {
  readonly key: string;
  readonly contentType: string;
  readonly expiresInSeconds: number;
}

export interface IS3Adapter {
  createPresignedPutUrl(input: PresignedPutUrlInput): Promise<string>;
}
