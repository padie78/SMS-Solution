variable "project_name" { type = string }
variable "environment"  { type = string }

variable "api_description" {
  type    = string
  default = "API Gateway para la plataforma de Sostenibilidad (SMS)"
}

# Configuración de CORS (Vienen desde el .tfvars a través de la raíz)
variable "api_cors_origins" { type = list(string) }
variable "api_cors_methods" { type = list(string) }
variable "api_cors_headers" { type = list(string) }
variable "api_cors_max_age" { 
  type = number 
  default = 300 
}

variable "auto_deploy" {
  type    = bool
  default = true
}

variable "lambda_role_arn" {
  type        = string
  description = "ARN del rol de IAM para las Lambdas"
}