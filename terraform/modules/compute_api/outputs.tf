output "api_id" {
  description = "ID único del API Gateway"
  value       = aws_apigatewayv2_api.http_api.id
}

output "api_execution_arn" {
  description = "ARN necesario para dar permisos de invocación a las Lambdas"
  value       = aws_apigatewayv2_api.http_api.execution_arn
}

output "api_url" {
  description = "URL base que usará el frontend de Angular"
  value       = aws_apigatewayv2_api.http_api.api_endpoint
}