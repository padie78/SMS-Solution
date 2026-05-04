import { Logger } from "@sms/shared";
import { ConfigError, ValidationError } from "../domain/errors.js";

/**
 * @param {{ useCase: { execute: Function } }} deps
 */
export function buildS3PutObjectHandler(deps) {
  return async (event, context) => {
    const requestId = context?.awsRequestId || "internal";

    try {
      Logger.info("S3 PutObject event received", { requestId, source: "dispatcher_lambda" });

      const record = event?.Records?.[0];
      const bucket = record?.s3?.bucket?.name;
      const rawKey = record?.s3?.object?.key;

      const result = await deps.useCase.execute({ requestId, bucket, rawKey });

      return {
        statusCode: 200,
        body: JSON.stringify({ ...result, requestId })
      };
    } catch (error) {
      const msg = error?.message ? String(error.message) : "Unknown error";
      Logger.error("Dispatcher workflow failed", { requestId, err: msg, source: "dispatcher_lambda" });

      const isClientError = error instanceof ValidationError;
      const isConfigError = error instanceof ConfigError;

      return {
        statusCode: isClientError ? 400 : 500,
        body: JSON.stringify({
          error: isClientError
            ? "Invalid Key Metadata"
            : isConfigError
              ? "Internal server configuration error."
              : "Internal Dispatcher Error",
          details: msg,
          requestId
        })
      };
    }
  };
}

