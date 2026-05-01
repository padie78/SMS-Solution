import { ConfigError, ValidationError } from "../domain/errors.js";

/**
 * @param {{ useCase: { execute: Function } }} deps
 */
export function buildAppSyncHandler(deps) {
  return async (event) => {
    const requestId = event?.requestContext?.requestId || "internal";
    const methodName = event?.info?.fieldName || event?.fieldName || "unknown";

    const orgId =
      event?.identity?.claims?.["custom:organization_id"] ||
      event?.identity?.claims?.["sub"] ||
      "f3d4f8a2-90c1-708c-a446-2c8592524d62";

    const args = event?.arguments || {};

    console.log(`[RESOLVER] Method: ${methodName} | Org: ${orgId}`);

    try {
      return await deps.useCase.execute({
        requestId,
        methodName,
        orgId,
        args
      });
    } catch (error) {
      const msg = error?.message ? String(error.message) : "Unknown error";
      console.error(`[LAMBDA FATAL ERROR] Method: ${methodName} | Message: ${msg}`);

      if (error instanceof ValidationError) {
        return { success: false, message: msg, vendor: "ERROR", total: 0, co2e: 0 };
      }
      if (error instanceof ConfigError) {
        return { success: false, message: "Internal server configuration error.", vendor: "ERROR", total: 0, co2e: 0 };
      }

      return { success: false, message: msg, vendor: "ERROR", total: 0, co2e: 0 };
    }
  };
}

