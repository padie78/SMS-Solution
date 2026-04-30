import { formatObjectKey } from "../../domain/formatObjectKey.js";
import { ConfigError, ValidationError } from "../../domain/errors.js";

export class GeneratePresignedUploadUrl {
  /**
   * @param {{
   *  presigner: import("../ports/S3Presigner.js").S3Presigner,
   *  uploadBucket: string | undefined,
   *  defaultContentType: string,
   *  expiresInSeconds: number
   * }} deps
   */
  constructor(deps) {
    this.deps = deps;
  }

  /**
   * @param {{ requestId: string, userId: string, input: import("../../app/core/models/signer.js").GeneratePresignedUploadUrlRequest }} params
   * @returns {Promise<import("../../app/core/models/signer.js").GeneratePresignedUploadUrlResponse>}
   */
  async execute(params) {
    const { requestId, userId, input } = params;

    if (!input?.invoiceId) {
      throw new ValidationError(`Missing required invoiceId parameter. requestId=${requestId}`);
    }

    if (!this.deps.uploadBucket) {
      throw new ConfigError(`UPLOAD_BUCKET environment variable is not defined. requestId=${requestId}`);
    }

    const key = formatObjectKey(userId, input.invoiceId, input.fileName);
    const contentType = input.fileType || this.deps.defaultContentType;

    const uploadURL = await this.deps.presigner.presignPutObject({
      bucket: this.deps.uploadBucket,
      key,
      contentType,
      expiresInSeconds: this.deps.expiresInSeconds
    });

    return {
      uploadURL,
      key,
      userId,
      invoiceId: input.invoiceId,
      message: "Presigned URL generated successfully."
    };
  }
}

