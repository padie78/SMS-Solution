# --- Identificación del Proyecto ---
variable "project_name" {
  description = "Nombre del proyecto (ej: sms)"
  type        = string
}

variable "environment" {
  description = "Entorno de despliegue (dev, prod, etc)"
  type        = string
}

variable "aws_region" {
  description = "Región de AWS"
  type        = string
}

# --- Seguridad e Infraestructura ---
variable "lambda_role_arn" {
  description = "ARN del rol de IAM para las Lambdas"
  type        = string
}

variable "upload_bucket_name" {
  description = "Nombre del bucket de S3 donde se suben los archivos"
  type        = string
}

variable "dynamo_table_name" {
  description = "Nombre de la tabla de DynamoDB para guardar resultados"
  type        = string
}

# --- Configuración de IA y APIs Externas ---
variable "bedrock_model_id" {
  description = "ID del modelo de Amazon Bedrock (ej: anthropic.claude-3-haiku)"
  type        = string
  default     = "anthropic.claude-3-haiku-20240307-v1:0"
}

variable "emissions_api_url" {
  description = "URL del motor de cálculo de emisiones externo"
  type        = string
}

variable "emissions_api_key" {
  description = "API Key para el motor de emisiones"
  type        = string
  sensitive   = true # Esto evita que el valor se imprima en los logs de Terraform
}