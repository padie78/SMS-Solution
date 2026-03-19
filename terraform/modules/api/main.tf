# --- INTEGRACIONES ---

# Integración para Query
resource "aws_apigatewayv2_integration" "query_integration" {
  api_id                 = var.api_id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.query_lambda_arn
  payload_format_version = "2.0"
}

# Integración para Signer
resource "aws_apigatewayv2_integration" "signer_integration" {
  api_id                 = var.api_id
  integration_type       = "AWS_PROXY"
  integration_uri        = var.signer_lambda_arn
  payload_format_version = "2.0"
}

# --- RUTAS ---

# Ruta GET /emissions
resource "aws_apigatewayv2_route" "query_route" {
  api_id    = var.api_id
  route_key = "GET ${var.query_route_path}"
  target    = "integrations/${aws_apigatewayv2_integration.query_integration.id}"
}

# Ruta POST /get-url
resource "aws_apigatewayv2_route" "signer_route" {
  api_id    = var.api_id
  route_key = "POST ${var.signer_route_path}"
  target    = "integrations/${aws_apigatewayv2_integration.signer_integration.id}"
}

# --- PERMISOS (Lambda Permissions) ---

resource "aws_lambda_permission" "query_permission" {
  statement_id  = "AllowExecutionFromAPIGatewayQuery"
  action        = "lambda:InvokeFunction"
  function_name = var.query_lambda_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_execution_arn}/*/*"
}

resource "aws_lambda_permission" "signer_permission" {
  statement_id  = "AllowExecutionFromAPIGatewaySigner"
  action        = "lambda:InvokeFunction"
  function_name = var.signer_lambda_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${var.api_execution_arn}/*/*"
}