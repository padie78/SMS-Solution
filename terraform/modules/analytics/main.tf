resource "aws_appsync_graphql_api" "analytics_hub" {
  name                = "sms-analytics-hub"
  authentication_type = "API_KEY" # Cambiar a AMAZON_COGNITO_USER_POOLS luego
  schema              = file("${path.module}/schema.graphql")

  xray_enabled = true
}

# Key de la API (para pruebas rápidas)
resource "aws_appsync_api_key" "hub_key" {
  api_id = aws_appsync_graphql_api.analytics_hub.id
}

# Datasource: Link a la Lambda de Analytics
resource "aws_appsync_datasource" "analytics_lambda_ds" {
  api_id           = aws_appsync_graphql_api.analytics_hub.id
  name             = "AnalyticsLambdaDS"
  type             = "AWS_LAMBDA"
  service_role_arn = aws_iam_role.appsync_runtime_role.arn

}

# Resolver: Conecta la Query con la Lambda
resource "aws_appsync_resolver" "analytics_query_resolver" {
  api_id      = aws_appsync_graphql_api.analytics_hub.id
  type        = "Query"
  field       = "getOrganizationAnalytics"
  data_source = aws_appsync_datasource.analytics_lambda_ds.name

  request_template = <<EOF
{
    "version": "2017-02-28",
    "operation": "Invoke",
    "payload": {
        "arguments": $util.toJson($context.arguments),
        "identity": $util.toJson($context.identity)
    }
}
EOF

  response_template = "$util.toJson($context.result)"
}