variable "project_name"   { type = string }
variable "environment"    { type = string }
variable "appsync_url"    { type = string }
variable "appsync_region" { type = string }
variable "user_pool_id"   { type = string }
variable "client_id"      { type = string }
variable "cloudfront_arn" {
  description = "ARN de la distribución para la política del bucket"
  type        = string
  default     = "" # Opcional para evitar errores en el primer init
}