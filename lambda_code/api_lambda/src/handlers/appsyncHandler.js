import { ConfigError, ValidationError } from "../domain/errors.js";
import {
  mergePartitionContextFromGraphQLArgs,
  normalizeAppSyncLambdaEvent,
  resolvePartitionContextFromEvent
} from "./appsyncEvent.util.js";

/**
 * Factory que construye el handler inyectando sus dependencias.
 * @param {{ useCase: { execute: Function } }} deps - Dependencias (normalmente HandleAppSyncRequest)
 */
export function buildAppSyncHandler(deps) {
  return async (event) => {
    const ev = normalizeAppSyncLambdaEvent(event);

    const requestId =
      ev?.requestContext?.requestId || event?.requestContext?.requestId || "internal";

    const methodName =
      ev?.info?.fieldName || event?.fieldName || ev?.methodName || "unknown";

    const args = ev?.arguments ?? event?.arguments ?? {};

    /** Multi-tenant: tenant desde Cognito; segmento ORG desde claims, `orgId` en GraphQL o env. */
    let partitionContext;
    try {
      partitionContext = resolvePartitionContextFromEvent(ev);
      partitionContext = mergePartitionContextFromGraphQLArgs(partitionContext, args);
    } catch (ctxErr) {
      if (ctxErr instanceof ValidationError) {
        return {
          success: false,
          message: ctxErr.message,
          id: null,
          path: null,
          entity: null,
        };
      }
      throw ctxErr;
    }

    console.log(
      `[RESOLVER][START] Method: ${methodName} | tenantId=${partitionContext.tenantId} | orgScope=${partitionContext.organizationScopeId} | Request: ${requestId}`
    );

    try {
      const result = await deps.useCase.execute({
        requestId,
        methodName,
        partitionContext,
        args,
      });

      console.log(`[RESOLVER][SUCCESS] Method: ${methodName}`);
      return result;
    } catch (error) {
      const msg = error?.message ? String(error.message) : "Unknown error";
      console.error(`[RESOLVER][FATAL ERROR] Method: ${methodName} | Message: ${msg}`);

      if (error instanceof ValidationError) {
        return {
          success: false,
          message: `Validación fallida: ${msg}`,
          id: null,
          path: null,
          entity: null,
        };
      }

      if (error instanceof ConfigError) {
        return {
          success: false,
          message: "Error de configuración interna del servidor.",
          id: null,
          path: null,
          entity: null,
        };
      }

      return {
        success: false,
        message: "Ocurrió un error inesperado en el procesamiento.",
        id: null,
        path: null,
        entity: null,
      };
    }
  };
}
