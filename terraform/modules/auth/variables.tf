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