# ==============================================================================
# 1. API GraphQL (Appsync)
# ==============================================================================
resource "aws_appsync_graphql_api" "api" {
  name                = "${var.project_name}-hub-${var.environment}"
  authentication_type = "AMAZON_COGNITO_USER_POOLS" 
  schema              = file("${path.module}/schema.graphql")
  xray_enabled        = true

  user_pool_config {
    default_action = "ALLOW"
    user_pool_id   = var.cognito_user_pool_id
    aws_region     = var.cognito_region
  }

  # PERMITE TESTS CON API KEY (Soluciona UnauthorizedException en scripts)
  additional_authentication_provider {
    authentication_type = "API_KEY"
  }

  log_config {
    cloudwatch_logs_role_arn = aws_iam_role.appsync_runtime_role.arn
    field_log_level          = "ALL"
  }
}

resource "aws_appsync_api_key" "hub_key" {
  api_id  = aws_appsync_graphql_api.api.id
  expires = timeadd(timestamp(), "8760h") 
}

# --- Lógica de DynamoDB Stream (Sin cambios) ---
resource "time_sleep" "wait_for_iam" {
  depends_on = [aws_iam_role_policy.lambda_stream_policy]
  create_duration = "30s"
}

resource "aws_lambda_event_source_mapping" "stats_aggregator_trigger" {
  event_source_arn  = var.emissions_table_stream_arn
  function_name     = var.kpi_lambda_arn
  starting_position = "LATEST"
  filter_criteria {
    filter {
      pattern = jsonencode({
        dynamodb = {
          NewImage = { metadata = { M = { is_draft = { BOOL = [false] } } } },
          OldImage = { metadata = { M = { is_draft = { BOOL = [true] } } } }
        }
      })
    }
  }
  depends_on = [time_sleep.wait_for_iam]
}

resource "aws_iam_role_policy" "lambda_stream_policy" {
  name = "sms-lambda-stream-policy"
  role = var.kpi_lambda_role_id 
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["dynamodb:GetRecords", "dynamodb:GetShardIterator", "dynamodb:DescribeStream", "dynamodb:ListStreams"]
      Resource = [var.emissions_table_stream_arn, split("/stream/", var.emissions_table_stream_arn)[0]]
    }]
  })
}

# ==============================================================================
# 2. ROL DE IAM PARA RUNTIME
# ==============================================================================
resource "aws_iam_role" "appsync_runtime_role" {
  name = "${var.project_name}-appsync-runtime-role-${var.environment}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "appsync.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "appsync_logs" {
  role       = aws_iam_role.appsync_runtime_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppSyncPushToCloudWatchLogs"
}

# ==============================================================================
# 3. DATA SOURCES
# ==============================================================================
resource "aws_appsync_datasource" "api_lambda_ds" {
  api_id           = aws_appsync_graphql_api.api.id
  name             = "APILambdaDS"
  type             = "AWS_LAMBDA"
  service_role_arn = aws_iam_role.appsync_runtime_role.arn
  lambda_config { function_arn = var.api_lambda_arn }
}

resource "aws_appsync_datasource" "signer_lambda_ds" {
  api_id           = aws_appsync_graphql_api.api.id
  name             = "SignerLambdaDS"
  type             = "AWS_LAMBDA"
  service_role_arn = aws_iam_role.appsync_runtime_role.arn
  lambda_config { function_arn = var.signer_lambda_arn }
}

resource "aws_appsync_datasource" "analytics_lambda_ds" {
  api_id           = aws_appsync_graphql_api.api.id
  name             = "AnalyticsLambdaDataSource"
  type             = "AWS_LAMBDA"
  service_role_arn = aws_iam_role.appsync_runtime_role.arn
  lambda_config { function_arn = var.analytics_lambda_arn }
}

# ==============================================================================
# 4. RESOLVERS (CON DEPENDENCIAS DE POLÍTICA)
# ==============================================================================

resource "aws_appsync_resolver" "mutation_resolvers" {
  for_each = toset([
    "saveOrgConfig", "createBranch", "saveBuilding", "saveCostCenter",
    "saveAsset", "saveMeter", "saveTariff", "saveProductionLog",
    "updateProductionLog", "saveEmissionFactor", "saveUser", "saveAlertRule",
    "approveInvoice", "confirmInvoice"
  ])

  api_id      = aws_appsync_graphql_api.api.id
  type        = "Mutation"
  field       = each.key
  data_source = aws_appsync_datasource.api_lambda_ds.name
  
  # EVITA Unauthorized/AccessDenied al crear
  depends_on = [aws_iam_role_policy.appsync_access_policy] 
}

resource "aws_appsync_resolver" "kpi_resolvers" {
  for_each = toset([
    "getPrecalculatedKPI",    # <--- Agrega este
    "getConsumptionAnalytics", # <--- Agrega este
    "getIntensityReport",
    "getInvoicesByPeriod", 
    "getCostCenters"
  ])

  api_id      = aws_appsync_graphql_api.api.id
  type        = "Query"
  field       = each.key
  data_source = aws_appsync_datasource.analytics_lambda_ds.name 

  depends_on = [aws_appsync_datasource.analytics_lambda_ds, aws_iam_role_policy.appsync_access_policy]
}

resource "aws_appsync_resolver" "get_url_resolver" {
  api_id      = aws_appsync_graphql_api.api.id
  type        = "Mutation"
  field       = "getPresignedUrl" 
  data_source = aws_appsync_datasource.signer_lambda_ds.name
  
  depends_on = [aws_appsync_datasource.signer_lambda_ds, aws_iam_role_policy.appsync_access_policy]
}

# ==============================================================================
# 5. POLÍTICA DE ACCESO
# ==============================================================================
resource "aws_iam_role_policy" "appsync_access_policy" {
  name = "AppSyncAccessPolicy"
  role = aws_iam_role.appsync_runtime_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "AllowLambdaInvocation"
        Action   = ["lambda:InvokeFunction"]
        Effect   = "Allow"
        Resource = [
          var.api_lambda_arn, "${var.api_lambda_arn}:*",
          var.signer_lambda_arn, "${var.signer_lambda_arn}:*",
          var.analytics_lambda_arn, "${var.analytics_lambda_arn}:*"
        ]
      },
      {
        Sid      = "AllowDynamoAccess"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:Query", "dynamodb:BatchGetItem"]
        Effect   = "Allow"
        Resource = [var.dynamo_table_arn, "${var.dynamo_table_arn}/index/*"]
      }
    ]
  })
}