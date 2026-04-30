import { ConfigError, ValidationError } from "../domain/errors.js";

/**
 * @param {{ useCase: { execute: Function } }} deps
 */
export function buildAppSyncHandler(deps) {
  return async (event) => {
    const requestId = event?.requestContext?.requestId || "internal";

    try {
      console.log(`[INFRA] [${requestId}] Starting presigned URL generation flow.`);

      const userId = event?.identity?.claims?.sub || "public";
      const input = event?.arguments || {};

      const result = await deps.useCase.execute({
        requestId,
        userId,
        input
      });

      console.log(`[SUCCESS] [${requestId}] Presigned URL generated successfully for invoiceId: ${result.invoiceId}`);
      return result;
    } catch (error) {
      const msg = error?.message ? String(error.message) : "Unknown error";
      console.error(`[FATAL_ERROR] [${requestId}] Exception: ${msg}`);

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

