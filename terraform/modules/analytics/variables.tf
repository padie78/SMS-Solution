variable "project_name" { type = string }
variable "environment"  { type = string }

variable "vpc_id" {
  description = "ID de la VPC para la instancia de Grafana"
  type        = string
}

variable "allowed_ip_network" {
  description = "CIDR de tu IP para acceso SSH/HTTP"
  type        = string
}

variable "dynamodb_table_arn" {
  description = "ARN de la tabla para que Grafana lea datos"
  type        = string
}

variable "ami_id" {
  description = "AMI para la EC2 de Analytics"
  type        = string
}

variable "key_name" {
  description = "Nombre de la llave SSH"
  type        = string
}