import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class S3PresignerAws {
  /**
   * @param {string} region
   */
  constructor(region) {
    this.s3 = new S3Client({ region });
  }

  /**
   * @param {{ bucket: string, key: string, contentType: string, expiresInSeconds: number }} params
   * @returns {Promise<string>}
   */
  async presignPutObject(params) {
    const command = new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      ContentType: params.contentType
    });

    return await getSignedUrl(this.s3, command, { expiresIn: params.expiresInSeconds });
  }
}

