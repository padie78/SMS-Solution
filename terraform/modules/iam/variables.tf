# modules/iam/variables.tf

variable "project_name" {
  type        = string
}

variable "environment" {
  type        = string
}

# Agregá estas si tu política las usa (como vimos antes)
variable "s3_uploads_bucket_arn" {
  type    = string
  default = "*" # O el ARN real
}

variable "dynamo_table_arn" {
  type    = string
  default = "*" # O el ARN real
}