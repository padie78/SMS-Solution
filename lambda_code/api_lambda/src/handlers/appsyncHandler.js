import { ConfigError, ValidationError } from "../domain/errors.js";
import {
  normalizeAppSyncLambdaEvent,
  resolveTrustedTenantId,
} from "./appsyncEvent.util.js";

/**
 * @param {{ useCase: { execute: Function } }} deps
 */
export function buildAppSyncHandler(deps) {
  return async (event) => {
    const ev = normalizeAppSyncLambdaEvent(event);
    const requestId =
      ev?.requestContext?.requestId || event?.requestContext?.requestId || "internal";

    const methodName =
      ev?.info?.fieldName || event?.fieldName || ev?.methodName || "unknown";

    const tenantId = resolveTrustedTenantId(ev);

    /** @deprecated nombre legacy; mismo UUID que Cognito/org */
    const orgId = tenantId;

    const args = ev?.arguments ?? event?.arguments ?? {};

    console.log(`[RESOLVER] Method: ${methodName} | Tenant: ${tenantId}`);

    try {
      return await deps.useCase.execute({
        requestId,
        methodName,
        orgId,
        tenantId,
        holdingId: tenantId,
        args,
      });
    } catch (error) {
      const msg = error?.message ? String(error.message) : "Unknown error";
      console.error(`[LAMBDA FATAL ERROR] Method: ${methodName} | Message: ${msg}`);

      if (error instanceof ValidationError) {
        return { success: false, message: msg, vendor: "ERROR", total: 0, co2e: 0 };
      }
      if (error instanceof ConfigError) {
        return {
          success: false,
          message: "Internal server configuration error.",
          vendor: "ERROR",
          total: 0,
          co2e: 0,
        };
      }

      return { success: false, message: msg, vendor: "ERROR", total: 0, co2e: 0 };
    }
  };
}
