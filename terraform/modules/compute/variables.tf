# ==============================================================================
# 1. IDENTIFICACIÓN Y ENTORNO
# ==============================================================================
variable "project_name" { 
  type        = string 
  description = "Nombre base del proyecto para prefijos de recursos"
}

variable "environment" { 
  type        = string 
  description = "Entorno de despliegue (dev, staging, prod)"
}

# ==============================================================================
# 2. SEGURIDAD (Roles Especializados)
# ==============================================================================
variable "api_lambda_role_arn" { 
  type        = string 
  description = "ARN del rol de IAM para la Lambda de API/CRUD (Acceso a DynamoDB)"
}

variable "invoice_processor_role_arn" { 
  type        = string 
  description = "ARN del rol de IAM para la Lambda de Procesamiento (Acceso a IA, S3 y DynamoDB)"
}

# Variable heredada por compatibilidad o para el Signer si no tiene rol propio
variable "lambda_role_arn" { 
  type        = string 
  description = "ARN del rol genérico para Lambdas auxiliares como el Signer"
}

# ==============================================================================
# 3. INFRAESTRUCTURA DE CÓMPUTO
# ==============================================================================
variable "lambda_architecture" { 
  type        = string 
  default     = "arm64" 
  description = "Arquitectura de ejecución (arm64 es más barata y eficiente)"
}

# ==============================================================================
# 4. RECURSOS RELACIONADOS (Data & Storage)
# ==============================================================================
variable "upload_bucket_name" { 
  type        = string 
  description = "Nombre del bucket S3 donde se suben las facturas"
}

variable "upload_bucket_arn" { 
  type        = string 
  description = "ARN del bucket S3 para políticas de acceso"
}

variable "dynamo_table_name" { 
  type        = string 
  description = "Nombre de la tabla DynamoDB Single Table"
}

variable "dynamo_table_arn" { 
  type        = string 
  description = "ARN de la tabla para permisos de IAM"
}

# ==============================================================================
# 5. CONFIGURACIÓN DE NEGOCIO / IA
# ==============================================================================
variable "emissions_api_url" { 
  type        = string 
  description = "Endpoint de la API externa de factores de emisión"
}

variable "emissions_api_key" { 
  type        = string
  sensitive   = true 
  description = "API Key para el servicio de emisiones"
}

variable "bedrock_model_id" { 
  type        = string 
  description = "ID del modelo de Amazon Bedrock (ej. anthropic.claude-3-haiku)"
}

variable "processor_role_arn" {
  description = "ARN del rol de IAM para la lambda processor"
  type        = String
}