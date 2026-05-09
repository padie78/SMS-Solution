/**
 * AppSync puede invocar la Lambda con el contexto completo o únicamente con el
 * JSON generado desde el mapping template (`holdingId`, `arguments`, `identity`, `info`).
 * @returns {*}
 */
export function normalizeAppSyncLambdaEvent(raw) {
  if (raw == null) return raw;
  const hasEnvelope =
    typeof raw === "object" &&
    typeof raw.arguments === "object" &&
    typeof raw.identity === "object" &&
    raw.info !== undefined;

  const hasClassicFieldName =
    raw.info?.fieldName != null || typeof raw.fieldName === "string";

  if (hasEnvelope && hasClassicFieldName) {
    return raw;
  }

  if (hasEnvelope) {
    return {
      holdingId: raw.holdingId,
      arguments: raw.arguments ?? {},
      identity: raw.identity,
      info: raw.info ?? { fieldName: "unknown", parentTypeName: "Mutation" },
      prev: raw.prev,
      stash: raw.stash,
      requestContext: raw.requestContext,
    };
  }

  return raw;
}

/**
 * Tenant id de confianza: primero payload inyectado por AppSync (`holdingId`), luego claims.
 */
export function resolveTrustedTenantId(event) {
  const claims = event?.identity?.claims ?? {};
  const fromClaims =
    (typeof claims["custom:holding_id"] === "string" && claims["custom:holding_id"]) ||
    (typeof claims["custom:organization_id"] === "string" &&
      claims["custom:organization_id"]) ||
    (typeof claims["sub"] === "string" && claims["sub"]);

  const injected =
    typeof event?.holdingId === "string"
      ? event.holdingId.trim()
      : typeof event?.payload?.holdingId === "string"
        ? event.payload.holdingId.trim()
        : "";

  if (
    injected &&
    fromClaims &&
    typeof claims["custom:organization_id"] === "string" &&
    claims["custom:organization_id"] !== injected
  ) {
    console.warn(
      "[SECURITY] holdingId JWT mismatch vs injected holdingId — using injector (AppSync)."
    );
  }

  const tenant = injected || fromClaims || "";
  const devFallback = "f3d4f8a2-90c1-708c-a446-2c8592524d62";
  return tenant || devFallback;
}
