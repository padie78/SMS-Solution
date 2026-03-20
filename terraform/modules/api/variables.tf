variable "api_id" {
  type        = string
  description = "ID del API Gateway (proviene de compute_api)"
}

variable "api_execution_arn" {
  type        = string
  description = "Execution ARN para permisos (proviene de compute_api)"
}

# --- Query Lambda (Consulta de Emisiones) ---
variable "query_lambda_arn" {
  type = string
}

variable "query_lambda_name" {
  type = string
}

variable "query_route_path" {
  type    = string
  default = "/emissions"
}

# --- Signer Lambda (Generación de URL S3) ---
variable "signer_lambda_arn" {
  type = string
}

variable "signer_lambda_name" {
  type = string
}

variable "signer_route_path" {
  type    = string
  default = "/get-url"
}

variable "cognito_user_pool_arn" {
  type        = string
  description = "ARN del User Pool de Cognito para autenticación"
}