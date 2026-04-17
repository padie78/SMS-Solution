# ==============================================================================
# 1. SEGURIDAD E IDENTIDAD (Cimientos)
# ==============================================================================
module "iam" {
  source           = "./modules/iam"
  project_name     = var.project_name
  environment      = var.environment
  dynamo_table_arn = module.database.table_arn
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
  
  # Roles inyectados desde IAM
  api_lambda_role_arn        = module.iam.api_lambda_role_arn
  processor_role_arn = module.iam.invoice_processor_role_arn 
  lambda_role_arn            = module.iam.lambda_role_arn

  # Conexión S3 y Dynamo
  upload_bucket_arn  = module.storage.bucket_arn 
  upload_bucket_name = module.storage.bucket_name
  dynamo_table_name  = module.database.table_name
  dynamo_table_arn   = module.database.table_arn

  # Configuración IA (Bedrock) y APIs externas
  emissions_api_key   = var.emissions_api_key
  emissions_api_url   = var.emissions_api_url
  bedrock_model_id    = var.bedrock_model_id
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


  # Persistencia
  dynamo_table_name    = module.database.table_name
  dynamo_table_arn     = module.database.table_arn

  # Seguridad Cognito
  cognito_user_pool_id = module.auth.user_pool_id
  cognito_region       = var.aws_region
}

# ==============================================================================
# 5. RESOLVERS ADICIONALES (Lógica JS Directa)
# ==============================================================================
# resource "aws_appsync_resolver" "get_yearly_kpi" {
#   api_id      = module.api.appsync_id 
#   data_source = module.api.dynamodb_datasource_name

#   type        = "Query"
#   field       = "getYearlyKPI"
#   kind        = "UNIT"
#   code        = file("${path.module}/resolvers/getYearlyKPI.js")

#   runtime {
#     name            = "APPSYNC_JS"
#     runtime_version = "1.0.0"
#   }
# }

# resource "aws_appsync_resolver" "get_quarterly_kpi" {
#   api_id      = module.api.appsync_id           # El ID de tu API AppSync
#   data_source = module.api.dynamodb_datasource_name # El nombre de tu DataSource de DynamoDB
  
#   type  = "Query"            # El tipo en el schema
#   field = "getQuarterlyKPI"  # El nombre exacto del query en el schema
#   kind = "UNIT"

#   # Aquí es donde se hace el "Attach" automático al archivo
#   code = file("${path.module}/resolvers/getQuarterlyKPI.js")

#   runtime {
#     name            = "APPSYNC_JS"
#     runtime_version = "1.0.0"
#   }
# }

# resource "aws_appsync_resolver" "get_monthly_kpi" {
#   api_id      = module.api.appsync_id
#   data_source = module.api.dynamodb_datasource_name
  
#   type  = "Query"
#   field = "getMonthlyKPI" # Debe coincidir con tu schema.graphql
#   kind = "UNIT"

#   # Ruta al archivo que creamos anteriormente con la lógica del Quarter automático
#   code = file("${path.module}/resolvers/getMonthlyKPI.js")

#   runtime {
#     name            = "APPSYNC_JS"
#     runtime_version = "1.0.0"
#   }
# }

# Ejemplo para activos de sucursal
# resource "aws_appsync_resolver" "get_branch_assets" {
#   api_id      = module.api.appsync_id
#   data_source = module.api.dynamodb_datasource_name
#   type        = "Query"
#   field       = "getBranchAssets"
#   kind        = "UNIT"
#   code        = file("${path.module}/resolvers/getBranchAssets.js")

#   runtime {
#     name            = "APPSYNC_JS"
#     runtime_version = "1.0.0"
#   }
# }