import type { AppSyncResolverEvent } from "aws-lambda";
import { GeneratePresignedUploadUrl } from "../application/usecases/GeneratePresignedUploadUrl.js";
import { ConfigError, ValidationError } from "../domain/errors.js";
import type { GeneratePresignedUploadUrlRequest, GeneratePresignedUploadUrlResponse } from "../app/core/models/signer.js";

export function buildAppSyncHandler(deps: {
  useCase: GeneratePresignedUploadUrl;
}): (event: AppSyncResolverEvent<GeneratePresignedUploadUrlRequest>) => Promise<GeneratePresignedUploadUrlResponse> {
  return async (event) => {
    // AppSyncResolverEvent typing doesn't expose requestContext, but it's present in some runtimes.
    const requestId = (event as any)?.requestContext?.requestId || "internal";

    try {
      console.log(`[INFRA] [${requestId}] Starting presigned URL generation flow.`);

      const userId = (event.identity as any)?.claims?.sub || "public";
      const input = (event.arguments || {}) as GeneratePresignedUploadUrlRequest;

      const result = await deps.useCase.execute({
        requestId,
        userId,
        input
      });

      console.log(`[SUCCESS] [${requestId}] Presigned URL generated successfully for invoiceId: ${result.invoiceId}`);
      return result;
    } catch (error: any) {
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

