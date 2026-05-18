/** Error de validación de entrada en la capa de aplicación (DTOs / invoke context). */
export class ApplicationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApplicationValidationError';
  }
}
