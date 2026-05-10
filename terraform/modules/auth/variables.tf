variable "project_name" {
  description = "Nombre del proyecto para prefijar recursos"
  type        = string
}

variable "environment" {
  description = "Entorno (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "post_confirmation_tenant_strategy" {
  type        = string
  description = "sub = custom:tenant_id = cognito sub | uuid = UUID nuevo por usuario (holding lógico por cuenta)"
  default     = "sub"
  validation {
    condition     = contains(["sub", "uuid"], var.post_confirmation_tenant_strategy)
    error_message = "post_confirmation_tenant_strategy debe ser sub o uuid."
  }
}

# Segmento ORG# de la PK (mismo formato que nodeId raíz), p. ej. org creada una vez en dev.
# Vacío = no tocar custom:organization_id en post-confirmation (lo asigna tu flujo vía Admin API / app).
variable "post_confirmation_default_organization_id" {
  type        = string
  description = "Opcional: rellena custom:organization_id tras sign-up si aún no existe (single-tenant / dev). Debe coincidir con el ID de org en Dynamo."
  default     = ""
}