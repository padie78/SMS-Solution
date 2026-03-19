variable "project_name"      { type = string }
variable "environment"       { type = string }
variable "upload_bucket_arn" { type = string }
variable "dynamo_table_name" { type = string }
variable "dynamo_table_arn"  { type = string }
variable "external_api_url"  { type = string }

# Variables de configuración de Lambda (Sin Hardcode)
variable "lambda_runtime"      { 
  type = string 
  default = "nodejs20.x" 
}
variable "lambda_architecture" { 
  type = string  
  default = "arm64" 
} # Más performance por menos precio
  
variable "lambda_source_path" { 
  type = string 
  default = "../lambda_extractor" 
}
variable "extractor_handler"  {
  type = string 
  default = "index.handler" 
}

variable "extractor_timeout"  { 
  type = number 
  default = 30 
}

variable "extractor_memory"   {
  type = number 
  default = 512 
}

# Seguridad: Lista de ARNs de modelos de Bedrock permitidos
variable "allowed_ai_models" {
  type    = list(string)
  default = ["*"] # En prod, pasamos el ARN específico de Claude 3.5 Sonnet o Haiku
}

variable "lambda_role_arn" {
  type = string       
  description = "ARN del rol de IAM que las Lambdas usarán para ejecutar (proviene de módulo IAM)"
}