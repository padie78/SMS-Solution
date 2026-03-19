variable "project_name" {
  description = "Nombre del proyecto"
  type        = string
}

variable "environment" {
  description = "Entorno: dev, staging, prod"
  type        = string
  default     = "dev"
}

variable "billing_mode" {
  description = "Modo de facturación de DynamoDB"
  type        = string
  default     = "PAY_PER_REQUEST"
}

variable "hash_key" {
  description = "Nombre del hash key principal"
  type        = string
  default     = "PK"
}

variable "range_key" {
  description = "Nombre del sort key principal"
  type        = string
  default     = "SK"
}

variable "gsi_name" {
  description = "Nombre del índice secundario global"
  type        = string
  default     = "GSI1"
}

variable "gsi_hash_key" {
  description = "Hash key del GSI"
  type        = string
  default     = "GSI1PK"
}

variable "gsi_range_key" {
  description = "Range key del GSI"
  type        = string
  default     = "GSI1SK"
}

variable "ttl_attribute_name" {
  description = "Nombre del atributo TTL"
  type        = string
  default     = "ttl"
}

variable "enable_ttl" {
  description = "Habilitar TTL"
  type        = bool
  default     = true
}

variable "encryption_enabled" {
  description = "Habilitar encriptación en reposo"
  type        = bool
  default     = true
}

variable "point_in_time_recovery_enabled" {
  description = "Habilitar Point-in-Time Recovery"
  type        = bool
  default     = false
}

variable "table_name" {
  description = "Nombre de la tabla DynamoDB"
  type        = string
} 

variable "tags" {
  description = "Tags adicionales"
  type        = map(string)
  default     = {}
}