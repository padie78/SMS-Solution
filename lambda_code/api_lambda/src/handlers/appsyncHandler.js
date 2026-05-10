import { ConfigError, ValidationError } from "../domain/errors.js";
import {
  mergePartitionContextFromGraphQLArgs,
  normalizeAppSyncLambdaEvent,
  resolvePartitionContextFromEvent
} from "./appsyncEvent.util.js";

/**
 * AppSync espera el tipo GraphQL del campo: getTree → LIST (array), getNode → Node|null, mutaciones → MutationResponse.
 * @param {string} methodName
 * @param {string} message
 * @returns {unknown}
 */
function errorPayloadForFieldName(methodName, message) {
  if (methodName === "getTree") {
    console.warn(`[RESOLVER][${methodName}] ${message} (retornando [] para cumplir tipo LIST)`);
    return [];
  }
  if (methodName === "getNode" || methodName === "getInvoice") {
    console.warn(`[RESOLVER][${methodName}] ${message} (retornando null)`);
    return null;
  }
  return {
    success: false,
    message,
    id: null,
    nodeId: null,
    path: null,
    entity: null
  };
}

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
        return errorPayloadForFieldName(methodName, ctxErr.message);
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
        return errorPayloadForFieldName(methodName, `Validación fallida: ${msg}`);
      }

      if (error instanceof ConfigError) {
        return errorPayloadForFieldName(
          methodName,
          "Error de configuración interna del servidor."
        );
      }

      return errorPayloadForFieldName(methodName, "Ocurrió un error inesperado en el procesamiento.");
    }
  };
}
