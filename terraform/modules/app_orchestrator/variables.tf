variable "project_name" { type = string }
variable "environment"  { type = string }

variable "analytics_lambda_arn" {
  description = "ARN de la lambda de analytics"
  type        = string
}

variable "analytics_lambda_name" {
  description = "Nombre de la lambda de analytics"
  type        = string
}

variable "cognito_user_pool_id" {
  description = "ID del user pool para AppSync"
  type        = string
}

variable "cognito_region" {
  description = "Region de AWS"
  type        = string
}