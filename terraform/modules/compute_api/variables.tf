# --- Identificación del Proyecto ---
variable "project_name" {
  type        = string
  description = "Nombre del proyecto (ej: sms-platform)"
}

variable "environment" {
  type        = string
  description = "Entorno (dev, stg, prod)"
}

# --- Configuración de la API ---
variable "api_description" {
  type        = string
  default     = "API Gateway para la plataforma de Sostenibilidad (SMS)"
  description = "Descripción que aparecerá en la consola de AWS"
}

# --- Configuración de CORS ---
variable "api_cors_origins" {
  type        = list(string)
  default     = ["*"]
  description = "Dominios permitidos (En prod usar dominio específico de Angular)"
}

variable "api_cors_methods" {
  type        = list(string)
  default     = ["GET", "POST", "PUT", "OPTIONS", "DELETE"]
  description = "Métodos HTTP permitidos"
}

variable "api_cors_headers" {
  type        = list(string)
  default     = ["content-type", "authorization", "x-amz-date", "x-api-key", "x-amz-security-token"]
  description = "Headers permitidos para las peticiones desde el frontend"
}

variable "api_cors_max_age" {
  type        = number
  default     = 300
  description = "Tiempo en segundos que el navegador cachea la configuración CORS"
}

variable "auto_deploy" {
  type        = bool
  default     = true
  description = "Indica si se debe desplegar automáticamente la API"
}

variable "lambda_role_arn" { 
  type        = string 
  description = "ARN del rol de IAM para las Lambdas"
}