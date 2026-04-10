# ==============================================================================
# 1. SEGURIDAD E IDENTIDAD (Cimientos)
# ==============================================================================
module "iam" {
  source       = "./modules/iam"
  project_name = var.project_name
  environment  = var.environment
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

  # Configuración de S3 para el SMS
  versioning_enabled      = false
  cors_allowed_origins    = var.cors_origins
  block_public_acls       = var.block_public_acls
  block_public_policy     = var.block_public_policy
  ignore_public_acls      = var.ignore_public_acls
  restrict_public_buckets = var.restrict_public_buckets
  processor_lambda_arn    = module.compute.processor_lambda_arn
  processor_lambda_name   = module.compute.processor_lambda_name
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
module "compute" {
  source       = "./modules/compute"
  project_name = var.project_name
  environment  = var.environment
  
  # Seguridad: Inyectamos el rol generado dinámicamente
  api_lambda_role_arn        = module.iam.api_lambda_role_arn
  invoice_processor_role_arn = module.iam.invoice_processor_role_arn
  lambda_role_arn            = module.iam.lambda_role_arn

  # Infraestructura: Conexión con Storage y Database
  upload_bucket_arn  = module.storage.bucket_arn
  upload_bucket_name = module.storage.bucket_name

  dynamo_table_name = module.database.table_name
  dynamo_table_arn  = module.database.table_arn

  # Configuración de la API de Emisiones y Bedrock
  emissions_api_key   = var.emissions_api_key
  emissions_api_url   = var.emissions_api_url
  bedrock_model_id    = var.bedrock_model_id
  
  # Runtime y Arquitectura
  lambda_architecture = var.lambda_architecture
} 

# ==============================================================================
# 4. ORQUESTACIÓN DE DATOS (GraphQL Hub - Reemplazo futuro de API Gateway)
# ==============================================================================
# Bloque de Analytics Hub
module "app_orchestrator" {
  source                = "./modules/app_orchestrator"
  project_name          = var.project_name
  environment           = var.environment
  analytics_lambda_arn  = module.compute.analytics_lambda_arn 
  analytics_lambda_name = module.compute.analytics_lambda_name
  cognito_user_pool_id  = module.auth.user_pool_id
  cognito_region        = var.aws_region
}

# ==============================================================================
# 5. INFRAESTRUCTURA API (Legacy / Gateway actual)
# ==============================================================================
module "compute_api" {
  source       = "./modules/compute_api"
  project_name = var.project_name
  environment  = var.environment

  auto_deploy     = var.auto_deploy

  # Configuración de CORS para el Frontend
  api_cors_origins = var.cors_origins
  api_cors_methods = var.api_cors_methods
  api_cors_headers = var.api_cors_headers
  api_cors_max_age = var.api_cors_max_age

  # Seguridad: Rol para el Authorizer/Invocación
  lambda_role_arn  = module.iam.lambda_role_arn
}

# ==============================================================================
# 6. RUTAS Y CONECTIVIDAD (Capa de Aplicación REST)
# ==============================================================================
module "api" {
  source            = "./modules/api"
  project_name      = var.project_name
  environment       = var.environment

  # Conexión con Cognito para Auth
  cognito_user_pool_arn = module.auth.user_pool_arn
  cognito_client_id     = module.auth.client_id
  cognito_endpoint      = module.auth.user_pool_endpoint
  
  # Infraestructura API Gateway
  api_id            = module.compute_api.api_id
  api_execution_arn = module.compute_api.api_execution_arn
  
  # Conexión con Lambdas (Signer para S3 y Processor para IA)
  signer_lambda_arn  = module.compute.signer_lambda_arn
  signer_lambda_name = module.compute.signer_lambda_name

  # Endpoints configurables
  query_route_path  = var.query_route_path
  signer_route_path = var.signer_route_path 
}

resource "aws_appsync_resolver" "get_yearly_kpi" {
  api_id      = aws_appsync_graphql_api.sustainability_api.id
  type        = "Query"
  field       = "getYearlyKPI"
  kind        = "UNIT"
  data_source = aws_appsync_datasource.dynamodb_stats.name

  # Aquí cargamos el código JS externo
  code = file("${path.module}/resolvers/getYearlyKPI.js")

  runtime {
    name            = "APPSYNC_JS"
    runtime_version = "1.0.0"
  }
}

# resource "aws_appsync_resolver" "get_branch_assets" {
#   api_id      = module.app_orchestrator.appsync_api_id
#   type        = "Query"
#   field       = "getBranchAssets"
#   kind        = "UNIT"
#   data_source = module.app_orchestrator.ds_dynamodb_name

#   code = file("${path.module}/resolvers/getBranchAssets.js")

#   runtime {
#     name            = "APPSYNC_JS"
#     runtime_version = "1.0.0"
#   }
# }