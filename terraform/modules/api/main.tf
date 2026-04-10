# ==============================================================================
# 1. API GraphQL (AppSync) - Recurso: api
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

  log_config {
    cloudwatch_logs_role_arn = aws_iam_role.appsync_runtime_role.arn
    field_log_level          = "ALL"
  }
}

# Key de la API vinculada al nuevo nombre
resource "aws_appsync_api_key" "hub_key" {
  api_id  = aws_appsync_graphql_api.api.id
  expires = timeadd(timestamp(), "8760h") 
}

# ==============================================================================
# 2. ROL DE IAM PARA RUNTIME
# ==============================================================================
resource "aws_iam_role" "appsync_runtime_role" {
  name = "${var.project_name}-appsync-runtime-role-V2-${var.environment}"

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
# 3. DATA SOURCES (Actualizados para apuntar a aws_appsync_graphql_api.api)
# ==============================================================================

resource "aws_appsync_datasource" "api_lambda_ds" {
  api_id           = aws_appsync_graphql_api.api.id
  name             = "APILambdaDS"
  type             = "AWS_LAMBDA"
  service_role_arn = aws_iam_role.appsync_runtime_role.arn

  lambda_config {
    function_arn = var.api_lambda_arn
  }
}

resource "aws_appsync_datasource" "signer_lambda_ds" {
  api_id           = aws_appsync_graphql_api.api.id
  name             = "SignerLambdaDS"
  type             = "AWS_LAMBDA"
  service_role_arn = aws_iam_role.appsync_runtime_role.arn

  lambda_config {
    function_arn = var.signer_lambda_arn
  }
}

resource "aws_appsync_datasource" "dynamodb_ds" {
  api_id           = aws_appsync_graphql_api.api.id
  name             = "DynamoDBDS"
  type             = "AMAZON_DYNAMODB"
  service_role_arn = aws_iam_role.appsync_runtime_role.arn

  dynamodb_config {
    table_name = var.dynamo_table_name
  }
}

# ==============================================================================
# 4. RESOLVERS
# ==============================================================================

resource "aws_appsync_resolver" "mutation_resolvers" {
  for_each = toset([
    "createBranch",
    "createAsset",
    "updateBranch",
    "deleteAsset"
  ])

  api_id      = aws_appsync_graphql_api.api.id
  type        = "Mutation"
  field       = each.key
  data_source = aws_appsync_datasource.api_lambda_ds.name
}

resource "aws_appsync_resolver" "get_url_resolver" {
  api_id      = aws_appsync_graphql_api.api.id
  type        = "Mutation"
  field       = "getPresignedUrl" 
  data_source = aws_appsync_datasource.signer_lambda_ds.name
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
          var.api_lambda_arn,
          var.signer_lambda_arn
        ]
      },
      {
        Sid      = "AllowDynamoAccess"
        Action   = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:BatchGetItem"
        ]
        Effect   = "Allow"
        Resource = [
          var.dynamo_table_arn,
          "${var.dynamo_table_arn}/index/*"
        ]
      }
    ]
  })
}