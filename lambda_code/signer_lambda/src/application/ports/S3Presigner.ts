export interface S3Presigner {
  presignPutObject(params: { bucket: string; key: string; contentType: string; expiresInSeconds: number }): Promise<string>;
}

