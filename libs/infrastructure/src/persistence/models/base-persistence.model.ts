import type { SingleTableWriteContext, TenantOrgContext } from '@sms/domain';

export type TenancyContext = TenantOrgContext;
export type SingleTablePersistenceContext = SingleTableWriteContext;

/**
 * Campos de infraestructura + auditoría para ítems Single-Table (TypeScript camelCase;
 * el mapper emite snake_case en DynamoDB salvo PK/SK que permanecen en mayúsculas).
 */
export interface SingleTableInfrastructureFields {
  PK: string;
  SK: string;
  /** Valor persistido como `entity_type` (discriminador de fila). */
  entityType: string;
  /** Optimistic locking — persistido como `_version`. */
  _version: number;
  /** ISO-8601 — persistido como `created_at` (ciclo de vida del ítem DDB). */
  recordCreatedAt: string;
  /** ISO-8601 — persistido como `updated_at`. */
  recordUpdatedAt: string;
}

/** Campos de auditoría del dominio omitidos en el payload (el ítem usa `recordCreatedAt` / `recordUpdatedAt`). */
export type DomainAuditOmit = 'createdAt' | 'updatedAt';
