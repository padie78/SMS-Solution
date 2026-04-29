# ==============================================================================
# 1. SEGURIDAD E IDENTIDAD (Cimientos)
# ==============================================================================
module "iam" {
  source           = "./modules/iam"
  project_name     = var.project_name
  environment      = var.environment
  dynamo_table_arn = module.database.table_arn
  
  invoice_queue_arn     = module.invoice_process_queue.arn
  invoice_queue_url     = module.invoice_process_queue.url

}

module "auth" {
  source       = "./modules/auth"
  project_name = var.project_name
  environment  = var.environment
}

# ==============================================================================
# 2. PERSISTENCIA Y ALMACENAMIENTO (Data Layer)
# ==============================================================================
module "storage" {
  source       = "./modules/storage"
  project_name = var.project_name
  environment  = var.environment

  versioning_enabled      = false
  cors_allowed_origins    = var.cors_origins
  block_public_acls       = var.block_public_acls
  block_public_policy     = var.block_public_policy
  ignore_public_acls      = var.ignore_public_acls
  restrict_public_buckets = var.restrict_public_buckets
  
  # Trigger de la Lambda de procesamiento al subir archivos
  dispatcher_lambda_arn    = module.compute.dispatcher_lambda_arn
  dispatcher_lambda_name   = module.compute.dispatcher_lambda_name
}

module "database" {
  source             = "./modules/database"
  project_name       = var.project_name
  environment        = var.environment
  table_name         = local.table_name 
  billing_mode       = var.billing_mode 
  enable_ttl         = var.enable_ttl   
  ttl_attribute_name = var.ttl_attribute_name
}

# ==============================================================================
# 3. CÓMPUTO (Lógica de Negocio / IA)
# ==============================================================================
# main.tf (Raíz)

module "compute" {
  source       = "./modules/compute"
  project_name = var.project_name
  environment  = var.environment
  
  # 1. Roles inyectados desde el módulo IAM
  dispatcher_role_arn = module.iam.dispatcher_lambda_role_arn
  worker_role_arn     = module.iam.worker_lambda_role_arn
  lambda_role_arn     = module.iam.lambda_role_arn
  api_lambda_role_arn = module.iam.api_lambda_role_arn

  # 2. Variable de SQS inyectada desde el módulo SQS
  sqs_queue_url       = module.invoice_process_queue.url

  # 3. Conexión S3 y Dynamo (Nombres y ARNs)
  upload_bucket_name  = module.storage.bucket_name
  upload_bucket_arn   = module.storage.bucket_arn # REPARADO: Se agregó el ARN
  dynamo_table_name   = module.database.table_name
  dynamo_table_arn    = module.database.table_arn   # REPARADO: Se agregó el ARN
  invoice_queue_arn = module.invoice_process_queue.invoice_queue_arn
    
  # 4. IA y APIs
  bedrock_model_id    = var.bedrock_model_id
  emissions_api_url   = var.emissions_api_url
  emissions_api_key   = var.emissions_api_key
  lambda_architecture = var.lambda_architecture
}

# ==============================================================================
# 4. ORQUESTACIÓN DE DATOS (GraphQL Hub con AppSync)
# ==============================================================================
module "api" {
  source               = "./modules/api" # Tu nuevo módulo AppSync
  project_name         = var.project_name
  environment          = var.environment
  
  # Lambdas conectadas (Signer y CRUD)
  signer_lambda_arn    = module.compute.signer_lambda_arn
  api_lambda_arn       = module.compute.api_lambda_arn
  analytics_lambda_arn = module.compute.analytics_lambda_arn
  kpi_lambda_arn       = module.compute.kpi_lambda_arn
  emissions_table_stream_arn = module.database.table_stream_arn 
  kpi_lambda_role_id = module.iam.lambda_role_name
  api_lambda_role_id = module.iam.api_lambda_role_name # <--- Cambialo aquí

  # Persistencia
  dynamo_table_name    = module.database.table_name
  dynamo_table_arn     = module.database.table_arn

  # Seguridad Cognito
  cognito_user_pool_id = module.auth.user_pool_id
  cognito_region       = var.aws_region
}

# ==============================================================================
# 6. FRONTEND HOSTING (Angular + PrimeNG + Tailwind)
# ==============================================================================
module "frontend" {
  source       = "./modules/frontend"
  project_name = var.project_name
  environment  = var.environment

  appsync_url    = module.api.appsync_url
  appsync_region = var.aws_region
  user_pool_id   = module.auth.user_pool_id
  client_id      = module.auth.client_id 
}

module "invoice_process_dlq" {
  source = "./modules/sqs"
  name   = "${var.project_name}-invoice-dlq-${var.environment}"
  tags   = { Environment = var.environment, Service = "billing" }
}

module "invoice_process_queue" {
  source  = "./modules/sqs"
  name    = "${var.project_name}-invoice-queue-${var.environment}"
  dlq_arn = module.invoice_process_dlq.arn 
  tags    = { Environment = var.environment, Service = "billing" }
}

# 3. Módulo de Frontend (Aquí es donde ocurre la magia)
module "frontend_storage" {
  source = "./modules/frontend"
  
  project_name   = var.project_name
  environment    = var.environment

  # CONEXIÓN AUTOMÁTICA: Usamos los outputs de los otros módulos
  appsync_url    = module.api.appsync_url 
  appsync_region = var.aws_region
  user_pool_id   = module.auth.user_pool_id
  client_id      = module.auth.client_id
  
  cloudfront_arn = module.frontend_cdn.cloudfront_arn
}

# 2. Luego llamamos a la red (CloudFront)
module "frontend_cdn" {
  source = "./modules/cloudfront"

  project_name                = var.project_name
  environment                 = var.environment
  
  # CORRECCIÓN: Usamos el output del módulo anterior, no el recurso directo
  bucket_name                 = module.frontend_storage.bucket_id
  bucket_regional_domain_name = module.frontend_storage.bucket_regional_domain_name

  tags = {
    Project     = "SMS"
    Environment = var.environment
  }
}

# main.tf (RAÍZ)

import {
  to = module.frontend_storage.aws_s3_bucket.webapp_bucket
  id = "sms-platform-dev-webapp-hosting" 
}