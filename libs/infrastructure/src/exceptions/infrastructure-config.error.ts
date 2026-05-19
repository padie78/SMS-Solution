/** Configuración de infraestructura inválida o ausente (env vars, URLs, etc.). */
export class InfrastructureConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InfrastructureConfigError';
  }
}
