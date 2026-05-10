/**
 * Single-table: nodo raíz ORGANIZATION (referencia TypeScript).
 * PK/SK/path alineadas al mismo ID real (p. ej. CB7647AC).
 *
 * Compatible con `PutCommand` de `@aws-sdk/lib-dynamodb`.
 */
export interface DocumentPutCommandInput {
  TableName: string;
  Item: Record<string, unknown>;
  ConditionExpression?: string;
}

export interface CognitoClaimsSubset {
  "custom:tenant_id"?: string;
  [key: string]: unknown;
}

export interface OrganizationNodePutItemInput {
  /** ID real de la organización (mismo valor en PK, SK y path), p. ej. CB7647AC */
  organizationRealId: string;
  name: string;
  metadata?: Record<string, unknown>;
  tableName: string;
  /** ISO-8601 */
  lastUpdated?: string;
}

/**
 * Extrae el tenant desde claims de Cognito (prioriza custom:tenant_id).
 */
export function extractTenantIdFromClaims(claims: CognitoClaimsSubset): string {
  const raw = claims["custom:tenant_id"];
  if (raw != null && String(raw).trim() !== "") {
    return String(raw).trim();
  }
  throw new Error("MISSING_TENANT_CLAIM: custom:tenant_id");
}

/** `TENANT#<tenantId>#ORG#<ID_REAL>` */
export function buildTenantOrgPk(tenantId: string, organizationRealId: string): string {
  const t = tenantId.trim();
  const o = organizationRealId.trim().toUpperCase();
  if (!t || !o) {
    throw new Error("INVALID_PK_COMPONENTS");
  }
  return `TENANT#${t}#ORG#${o}`;
}

/** `ORGANIZATION#<ID_REAL>` */
export function buildOrganizationSk(organizationRealId: string): string {
  const o = organizationRealId.trim().toUpperCase();
  if (!o) throw new Error("INVALID_ORG_ID");
  return `ORGANIZATION#${o}`;
}

/** Path raíz: `#<ID_REAL>#` */
export function buildOrganizationRootPath(organizationRealId: string): string {
  const o = organizationRealId.trim().toUpperCase().replace(/\s+/g, "-");
  return `#${o}#`;
}

/**
 * Params listos para `PutCommand` / `PutItem` document (misma PK en `holdingId` para GSI por path).
 */
export function buildOrganizationNodePutCommandInput(
  tenantId: string,
  params: OrganizationNodePutItemInput
): DocumentPutCommandInput {
  const orgId = params.organizationRealId.trim().toUpperCase().replace(/\s+/g, "-");
  const pk = buildTenantOrgPk(tenantId, orgId);
  const sk = buildOrganizationSk(orgId);
  const path = buildOrganizationRootPath(orgId);
  const ts = params.lastUpdated ?? new Date().toISOString();

  return {
    TableName: params.tableName,
    Item: {
      PK: pk,
      SK: sk,
      holdingId: pk,
      path,
      entityType: "ORGANIZATION",
      name: params.name,
      parentId: "ROOT",
      metadata: params.metadata ?? {},
      last_updated: ts
    },
    ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)"
  };
}
