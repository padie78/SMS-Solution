variable "project_name" { type = string }
variable "environment"  { type = string }

variable "dynamo_table_arn" { type = string }
variable "invoice_queue_arn" { type = string }
variable "invoice_queue_url" { type = string }

# Estas son las que inyectamos desde compute
variable "dispatcher_lambda_arn" { type = string }
variable "worker_lambda_arn"     { type = string }

# LAS QUE CAUSABAN EL ERROR (BORRADAS):
# variable "worker_lambda_role_name" {} 
# variable "dispatcher_lambda_role_name" {}