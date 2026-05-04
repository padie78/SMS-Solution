import {
  parsePresignedUploadUrlResult,
  safeParsePresignedUploadUrlInput
} from "@sms/common";
import { formatObjectKey } from "../../domain/formatObjectKey.js";
import { ConfigError, ValidationError } from "../../domain/errors.js";

/** @param {{ issues: ReadonlyArray<{ path: (string|number)[], message: string }> }} err */
function presignedInputValidationMessage(err) {
  return err.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
}

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
   * @param {{
   *   requestId: string,
   *   userId: string,
   *   input: import('@sms/common').PresignedUploadUrlInput | Record<string, unknown>
   * }} params
   * @returns {Promise<import('@sms/common').PresignedUploadUrlResult>}
   */
  async execute(params) {
    const { requestId, userId, input } = params;

    const parsed = safeParsePresignedUploadUrlInput(input ?? {});
    if (!parsed.success) {
      throw new ValidationError(
        `${presignedInputValidationMessage(parsed.error)} requestId=${requestId}`
      );
    }

    if (!this.deps.uploadBucket) {
      throw new ConfigError(`UPLOAD_BUCKET environment variable is not defined. requestId=${requestId}`);
    }

    const { invoiceId, fileName, fileType } = parsed.data;
    const key = formatObjectKey(userId, invoiceId, fileName);
    const contentType = fileType || this.deps.defaultContentType;

    const uploadURL = await this.deps.presigner.presignPutObject({
      bucket: this.deps.uploadBucket,
      key,
      contentType,
      expiresInSeconds: this.deps.expiresInSeconds
    });

    return parsePresignedUploadUrlResult({
      uploadURL,
      key,
      userId,
      invoiceId,
      message: "Presigned URL generated successfully."
    });
  }
}

