# 1. API GraphQL (AppSync)
resource "aws_appsync_graphql_api" "app_orchestrator" {
  name                = "${var.project_name}-hub-${var.environment}"
  authentication_type = "API_KEY" 
  schema              = file("${path.module}/schema.graphql")
  xray_enabled        = true
}

# 2. Key de la API
resource "aws_appsync_api_key" "hub_key" {
  api_id  = aws_appsync_graphql_api.app_orchestrator.id
  expires = timeadd(timestamp(), "8760h") 
}

# 3. Rol de IAM para AppSync- (Acceso a Lambda y DynamoDB)
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

# 4. DATA SOURCE 1: Conexión con la Lambda de CRUD (api_lambda)
# Reemplaza al antiguo AnalyticsLambdaDS
resource "aws_appsync_datasource" "api_lambda_ds" {
  api_id           = aws_appsync_graphql_api.app_orchestrator.id
  name             = "APILambdaDS"
  type             = "AWS_LAMBDA"
  service_role_arn = aws_iam_role.appsync_runtime_role.arn

  lambda_config {
    function_arn = var.api_lambda_arn
  }
}

# 5. DATA SOURCE 2: Conexión Directa a DynamoDB
# Este es el que usarán tus Resolvers JS de Analytics
resource "aws_appsync_datasource" "dynamodb_ds" {
  api_id           = aws_appsync_graphql_api.app_orchestrator.id
  name             = "DynamoDBDS"
  type             = "AMAZON_DYNAMODB"
  service_role_arn = aws_iam_role.appsync_runtime_role.arn

  dynamodb_config {
    table_name = var.dynamo_table_name
  }
}

# 6. RESOLVERS PARA MUTATIONS (Vía Lambda)
# Aquí pones lo que requiere lógica de negocio (escritura)
resource "aws_appsync_resolver" "mutation_resolvers" {
  for_each = toset([
    "createBranch",
    "createAsset",
    "updateBranch",
    "deleteAsset"
  ])

  api_id      = aws_appsync_graphql_api.app_orchestrator.id
  type        = "Mutation"
  field       = each.key
  data_source = aws_appsync_datasource.api_lambda_ds.name
}

# 7. POLÍTICA DE ACCESO: Permisos para que AppSync lea Dynamo y llame a la Lambda
resource "aws_iam_role_policy" "appsync_access_policy" {
  name = "AppSyncAccessPolicy"
  role = aws_iam_role.appsync_runtime_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = ["lambda:InvokeFunction"]
        Effect   = "Allow"
        Resource = var.api_lambda_arn
      },
      {
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