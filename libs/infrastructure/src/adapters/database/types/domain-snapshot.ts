/**
 * Extrae propiedades de datos de una entidad de dominio (excluye métodos de instancia).
 */
export type DomainDataOnly<T> = Pick<
  T,
  { [K in keyof T]: T[K] extends (...args: never[]) => unknown ? never : K }[keyof T]
>;
