# 1. API GraphQL (AppSync)
resource "aws_appsync_graphql_api" "app_orchestrator" {
  name                = "${var.project_name}-analytics-hub-${var.environment}"
  authentication_type = "API_KEY" # Cambiar a AMAZON_COGNITO_USER_POOLS para producción
  schema              = file("${path.module}/schema.graphql")

  xray_enabled = true

  tags = {
    Name        = "${var.project_name}-analytics-hub"
    Environment = var.environment
  }
}

# 2. Key de la API (Para pruebas iniciales)
resource "aws_appsync_api_key" "hub_key" {
  api_id  = aws_appsync_graphql_api.app_orchestrator.id
  expires = timeadd(timestamp(), "8760h") # Expira en 1 año
}

# 3. Rol de IAM para que AppSync invoque la Lambda
resource "aws_iam_role" "appsync_runtime_role" {
  name = "${var.project_name}-appsync-lambda-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "appsync.amazonaws.com"
      }
    }]
  })
}

# 4. Política para permitir la invocación de la Lambda específica
resource "aws_iam_role_policy" "appsync_lambda_invoke" {
  name = "AppSyncInvokeAnalyticsLambda"
  role = aws_iam_role.appsync_runtime_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = "lambda:InvokeFunction"
      Effect   = "Allow"
      Resource = var.analytics_lambda_arn
    }]
  })
}

# 5. DataSource: Conexión con la Lambda de Analytics
resource "aws_appsync_datasource" "analytics_lambda_ds" {
  api_id           = aws_appsync_graphql_api.app_orchestrator.id
  name             = "AnalyticsLambdaDS"
  type             = "AWS_LAMBDA"
  service_role_arn = aws_iam_role.appsync_runtime_role.arn

  lambda_config {
    function_arn = var.analytics_lambda_arn
  }
}

# 6. Resolvers dinámicos para todas las Queries del SMS
resource "aws_appsync_resolver" "analytics_resolvers" {
  for_each = toset([
    "getYearlyKPI",
    "getMonthlyKPI",
    "getEvolution",
    "getIntensity",
    "getForecast",
    "getAuditReport",
    "searchInvoices"
  ])

  api_id      = aws_appsync_graphql_api.app_orchestrator.id
  type        = "Query"
  field       = each.key
  data_source = aws_appsync_datasource.analytics_lambda_ds.name

  # Template optimizado para pasar todo el contexto (incluyendo identity y info)
  request_template = <<EOF
{
    "version": "2017-02-28",
    "operation": "Invoke",
    "payload": {
        "arguments": $util.toJson($context.arguments),
        "identity": $util.toJson($context.identity),
        "info": {
            "fieldName": "$context.info.fieldName"
        }
    }
}
EOF

  response_template = "$util.toJson($context.result)"
}