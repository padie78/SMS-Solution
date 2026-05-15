/** Aislamiento multitenant para PK `TENANT#…#ORG#…`. */
export interface TenantOrgContext {
    tenantId: string;
    orgId: string;
}
/** Metadatos obligatorios al persistir un ítem (versionado + auditoría de fila). */
export interface SingleTableWriteContext extends TenantOrgContext {
    version: number;
    recordCreatedAt: string;
    recordUpdatedAt: string;
}
//# sourceMappingURL=write-context.d.ts.map