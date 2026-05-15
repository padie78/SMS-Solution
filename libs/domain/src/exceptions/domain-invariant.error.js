/** Violación de invariantes del modelo de dominio SMS (entidades / value objects). */
export class DomainInvariantError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DomainInvariantError';
    }
}
//# sourceMappingURL=domain-invariant.error.js.map