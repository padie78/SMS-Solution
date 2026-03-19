# 1. El Recurso Principal: API Gateway HTTP (El "Edificio")
resource "aws_apigatewayv2_api" "http_api" {
  name          = "${var.project_name}-${var.environment}-api"
  protocol_type = "HTTP"
  description   = var.api_description

  cors_configuration {
    allow_origins = var.api_cors_origins
    allow_methods = var.api_cors_methods
    allow_headers = var.api_cors_headers
    max_age       = var.api_cors_max_age
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# 2. Stage por defecto (La "Puerta" para que la URL sea pública)
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = var.auto_deploy
}