/**
 * Alta de org (nodo raíz): nodeId UUID único por empresa; nunca igual a tenantId.
 * Integrar con DocumentClient: PutCommand como en ConfigServiceAdapter.saveOrganizationRootNode.
 */
import { randomUUID } from "node:crypto";
import type { PutCommandInput } from "@aws-sdk/lib-dynamodb";
import { buildTenantOrgPartitionKey, normalizePartitionSegment } from "./organizationKeys.js";

export interface SaveOrganizationRootInput {
  readonly id?: string | null;
  /** Preferencia sobre `id` si ambos existen en GraphQL */
  readonly nodeId?: string | null;
  readonly name: string;
  readonly metadata?: Record<string, unknown> | string | null;
}

function normalizeNodeIdSegment(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");
}

export interface SaveOrganizationRootResult {
  readonly success: boolean;
  readonly message?: string;
  readonly nodeId?: string;
  readonly path?: string;
  readonly item?: Record<string, unknown>;
}

/**
 * Construye PutCommand para la raíz ORGANIZATION. Rechaza nodeId === tenantId.
 */
export function buildOrganizationRootPutInput(
  tableName: string,
  tenantId: string,
  input: SaveOrganizationRootInput
): { put: PutCommandInput; nodeId: string; tenantSegment: string } {
  const raw = input.id ?? input.nodeId;
  const nodeId = raw ? normalizeNodeIdSegment(raw) : randomUUID().toUpperCase();
  const tSeg = normalizePartitionSegment(tenantId);
  const nSeg = normalizeNodeIdSegment(nodeId);

  if (!tSeg || !nSeg) {
    throw new Error("INVALID_TENANT_OR_NODE");
  }
  if (nSeg === tSeg) {
    throw new Error("NODE_ID_MUST_DIFFER_FROM_TENANT");
  }

  const pk = buildTenantOrgPartitionKey(tenantId, nSeg);
  if (!pk) {
    throw new Error("INVALID_PK");
  }

  const sk = `ORGANIZATION#${nSeg}`;
  const path = `#${nSeg}#`;
  const ts = new Date().toISOString();

  let metadata: Record<string, unknown> = {};
  const m = input.metadata;
  if (typeof m === "string") {
    try {
      metadata = m.trim() ? (JSON.parse(m) as Record<string, unknown>) : {};
    } catch {
      metadata = {};
    }
  } else if (m != null && typeof m === "object" && !Array.isArray(m)) {
    metadata = { ...m };
  }

  const item: Record<string, unknown> = {
    PK: pk,
    SK: sk,
    holdingId: pk,
    path,
    entityType: "ORGANIZATION",
    name: input.name,
    parentId: "ROOT",
    metadata,
    last_updated: ts
  };

  const put: PutCommandInput = {
    TableName: tableName,
    Item: item,
    ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)"
  };

  return { put, nodeId: nSeg, tenantSegment: tSeg };
}
