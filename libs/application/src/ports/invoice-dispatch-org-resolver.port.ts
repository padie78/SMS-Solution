/** Puerto driven: resolver `orgId` desde contexto del objeto S3. */
export interface InvoiceDispatchOrgResolverPort {
  resolveOrgId(params: {
    bucket: string;
    key: string;
    requestId: string;
  }): Promise<string>;
}
