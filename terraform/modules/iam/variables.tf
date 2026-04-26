variable "project_name"      { type = string }
variable "environment"       { type = string }
variable "dynamo_table_arn"  { type = string }
variable "invoice_queue_arn" { type = string }
variable "invoice_queue_url" { type = string }

# ELIMINAMOS ESTAS PARA ROMPER EL CÍRCULO:
# variable "dispatcher_lambda_arn" 
# variable "worker_lambda_arn"