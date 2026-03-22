variable "project_name"      { type = string }
variable "environment"       { type = string }
variable "lambda_role_arn"   { type = string }
variable "lambda_architecture" { 
  type = string 
  default = "arm64" 
}

# Infraestructura relacionada
variable "upload_bucket_name" { type = string }
variable "upload_bucket_arn"  { type = string }
variable "dynamo_table_name"  { type = string }
variable "dynamo_table_arn"   { type = string }

# Configuración de Negocio / IA
variable "emissions_api_url"  { type = string }
variable "emissions_api_key"  { 
  type = string
  sensitive = true 
}
variable "bedrock_model_id"   { type = string }