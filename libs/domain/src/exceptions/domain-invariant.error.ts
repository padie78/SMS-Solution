/** Violación de invariantes del modelo de dominio SMS (entidades / value objects). */
export class DomainInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainInvariantError';
  }
}
