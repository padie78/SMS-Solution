/** Resultado paginado genérico (listados API / GraphQL). */
export interface PagedResult<T> {
  readonly items: readonly T[];
  readonly nextToken?: string;
  readonly totalCount?: number;
}
