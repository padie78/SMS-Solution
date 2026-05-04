import { Logger } from "@sms/shared";
import { ConfigError, ValidationError } from "../domain/errors.js";

/**
 * @param {{ useCase: { execute: Function } }} deps
 */
export function buildAppSyncHandler(deps) {
  return async (event) => {
    const requestId = event?.requestContext?.requestId || "internal";

    try {
      Logger.info("Presigned URL generation started", { requestId, source: "signer_lambda" });

      const userId = event?.identity?.claims?.sub || "public";
      const input = event?.arguments || {};

      const result = await deps.useCase.execute({
        requestId,
        userId,
        input
      });

      Logger.info("Presigned URL generated", {
        requestId,
        invoiceId: result.invoiceId,
        source: "signer_lambda"
      });
      return result;
    } catch (error) {
      const msg = error?.message ? String(error.message) : "Unknown error";
      Logger.error("Signer handler failed", { requestId, err: msg, source: "signer_lambda" });

      if (error instanceof ValidationError) {
        throw new Error(msg);
      }

      if (error instanceof ConfigError) {
        throw new Error("Internal server configuration error.");
      }

      throw new Error("Internal Signer Error");
    }
  };
}

