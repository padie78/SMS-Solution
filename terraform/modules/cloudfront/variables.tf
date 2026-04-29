variable "project_name" {
  description = "Nombre del proyecto (ej: sms-platform)"
  type        = string
}

variable "environment" {
  description = "Ambiente (dev, staging, prod)"
  type        = string
}

variable "bucket_name" {
  description = "Nombre del bucket de S3 del frontend"
  type        = string
}

variable "bucket_regional_domain_name" {
  description = "Domain name regional del bucket S3"
  type        = string
}

variable "tags" {
  description = "Tags para los recursos"
  type        = map(string)
  default     = {}
}