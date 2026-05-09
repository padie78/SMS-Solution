import { ConfigError, ValidationError } from "../domain/errors.js";
import {
  normalizeAppSyncLambdaEvent,
  resolveTrustedTenantId,
} from "./appsyncEvent.util.js";

/**
 * Factory que construye el handler inyectando sus dependencias.
 * @param {{ useCase: { execute: Function } }} deps - Dependencias (normalmente HandleAppSyncRequest)
 */
export function buildAppSyncHandler(deps) {
  return async (event) => {
    // 1. Normalización del evento (soporta diferentes versiones de AppSync)
    const ev = normalizeAppSyncLambdaEvent(event);
    
    const requestId =
      ev?.requestContext?.requestId || event?.requestContext?.requestId || "internal";

    // 2. Identificación del método (Mutation/Query de GraphQL)
    const methodName =
      ev?.info?.fieldName || event?.fieldName || ev?.methodName || "unknown";

    // 3. Resolución de Identidad (Multi-tenancy seguro)
    // Extrae el tenantId desde $context.identity.claims o $context.identity.sub
    const tenantId = resolveTrustedTenantId(ev);

    /** 
     * El orgId es nuestro scope principal en DynamoDB (PK: ORG#uuid)
     * Usamos el tenantId resuelto de Cognito para garantizar aislamiento.
     */
    const orgId = tenantId;

    // 4. Extracción de Argumentos
    const args = ev?.arguments ?? event?.arguments ?? {};

    console.log(`[RESOLVER][START] Method: ${methodName} | Org: ${orgId} | Request: ${requestId}`);

    try {
      // 5. Delegación al Orquestador (Usecase / HandleAppSyncRequest)
      const result = await deps.useCase.execute({
        requestId,
        methodName,
        orgId,         // Identificador de la organización
        tenantId,      // Alias para consistencia
        holdingId: orgId,
        args,          // Contiene el 'input' y otros argumentos de la query
      });

      console.log(`[RESOLVER][SUCCESS] Method: ${methodName}`);
      return result;

    } catch (error) {
      // 6. Manejo de Errores Centralizado
      const msg = error?.message ? String(error.message) : "Unknown error";
      console.error(`[RESOLVER][FATAL ERROR] Method: ${methodName} | Message: ${msg}`);

      // Mapeo de errores de dominio a respuestas de AppSync
      if (error instanceof ValidationError) {
        return { 
            success: false, 
            message: `Validación fallida: ${msg}`,
            errorType: "BadRequest"
        };
      }

      if (error instanceof ConfigError) {
        return {
          success: false,
          message: "Error de configuración interna del servidor.",
          errorType: "InternalConfigError"
        };
      }

      // Error genérico para no exponer detalles internos en producción
      return { 
          success: false, 
          message: "Ocurrió un error inesperado en el procesamiento.",
          errorType: "InternalError" 
      };
    }
  };
}