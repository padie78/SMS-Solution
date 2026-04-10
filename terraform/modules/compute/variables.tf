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
# 2. SEGURIDAD (Roles Especializados inyectados desde IAM)
# ==============================================================================
variable "api_lambda_role_arn" { 
  type        = string 
  description = "ARN del rol para la Lambda de CRUD (Acceso a DynamoDB)"
}

variable "processor_role_arn" {
  type        = string
  description = "ARN del rol para la Lambda Processor (Acceso a IA, S3 y DynamoDB)"
}

variable "lambda_role_arn" { 
  type        = string 
  description = "ARN del rol genérico para Lambdas auxiliares como el Signer"
}


# ==============================================================================
# 3. INFRAESTRUCTURA Y RUNTIME
# ==============================================================================
variable "lambda_architecture" { 
  type        = string 
  default     = "arm64" 
  description = "Arquitectura de ejecución (x86_64 o arm64)"
}

# ==============================================================================
# 4. CONEXIÓN CON DATA & STORAGE
# ==============================================================================
variable "upload_bucket_name" { 
  type        = string 
  description = "Nombre del bucket S3 para almacenamiento de facturas"
}

variable "upload_bucket_arn" { 
  type        = string 
  description = "ARN del bucket S3"
}

variable "dynamo_table_name" { 
  type        = string 
  description = "Nombre de la tabla DynamoDB"
}

variable "dynamo_table_arn" { 
  type        = string 
  description = "ARN de la tabla DynamoDB"
}

# ==============================================================================
# 5. CONFIGURACIÓN EXTERNA (IA & APIs)
# ==============================================================================
variable "bedrock_model_id" { 
  type        = string 
  description = "ID del modelo de Amazon Bedrock"
}

variable "emissions_api_url" { 
  type        = string 
  description = "Endpoint de la API externa de factores de emisión"
}

variable "emissions_api_key" { 
  type        = string
  sensitive   = true 
  description = "API Key para el servicio de emisiones"
}