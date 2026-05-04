/** Violación de invariantes del árbol SMS (localización / activos / alcance usuario). */
export class SmsDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SmsDomainError';
  }
}

/** @deprecated Usar `SmsDomainError`. */
export const RegionDomainError = SmsDomainError;
