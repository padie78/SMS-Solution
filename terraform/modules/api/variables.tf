# ==============================================================================
# 1. IDENTIFICACIÓN Y ENTORNO
# ==============================================================================
variable "project_name" { 
  type        = string 
  description = "Nombre base del proyecto"
}

variable "environment" { 
  type        = string 
  description = "Entorno de despliegue (dev, staging, prod)"
}

# ==============================================================================
# 2. CONEXIÓN CON COMPUTE (Lambdas)
# ==============================================================================
variable "api_lambda_arn" {
  description = "ARN de la Lambda de API/CRUD que procesará las Mutations"
  type        = string
}

variable "signer_lambda_arn" {
  description = "ARN de la lambda que genera las presigned URLs"
  type        = string
}

variable "analytics_lambda_arn" {
  description = "ARN de la Lambda que procesa los eventos de Analytics"
  type        = string
}

variable "kpi_lambda_arn" {
  description = "ARN de la Lambda que procesa los eventos de KPI"
  type        = string
}



# ==============================================================================
# 3. CONEXIÓN CON DATA (DynamoDB)
# ==============================================================================
variable "dynamo_table_name" {
  description = "Nombre de la tabla DynamoDB para el Data Source nativo"
  type        = string
}

variable "dynamo_table_arn" {
  description = "ARN de la tabla DynamoDB para los permisos de IAM de AppSync"
  type        = string
}


# ==============================================================================
# 4. AUTENTICACIÓN Y REGIÓN
# ==============================================================================
variable "cognito_user_pool_id" {
  description = "ID del User Pool de Cognito para la seguridad de AppSync"
  type        = string
}

variable "cognito_region" {
  description = "Región de AWS donde reside el User Pool"
  type        = string
}

# --- ESTA ES LA QUE TE FALTABA ---
variable "aws_region" {
  description = "Región general de AWS para recursos de logging y X-Ray"
  type        = string
  default     = "eu-central-1"
}

variable "emissions_table_stream_arn" {
  type = string
}

variable "kpi_lambda_role_id" {
  type        = string
  description = "El ID o nombre del rol de la Lambda de KPIs para adjuntar la política de streams"
}

variable "api_lambda_role_id" {
  type        = string
  description = "ID del rol de IAM de la Lambda API"
}
