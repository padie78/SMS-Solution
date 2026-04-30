import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { S3Presigner } from "../../application/ports/S3Presigner.js";

export class S3PresignerAws implements S3Presigner {
  private readonly s3: S3Client;

  constructor(region: string) {
    this.s3 = new S3Client({ region });
  }

  async presignPutObject(params: {
    bucket: string;
    key: string;
    contentType: string;
    expiresInSeconds: number;
  }): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      ContentType: params.contentType
    });

    return await getSignedUrl(this.s3, command, { expiresIn: params.expiresInSeconds });
  }
}

