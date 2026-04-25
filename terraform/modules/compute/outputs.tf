# Extraemos el ID/Nombre del rol desde el ARN que recibimos por variable
output "api_lambda_role_id" {
  description = "ID del rol de IAM para la Lambda de API"
  value       = element(split("/", var.api_lambda_role_arn), length(split("/", var.api_lambda_role_arn)) - 1)
}

output "api_lambda_arn" {
  value = aws_lambda_function.api_lambda.arn
}

output "signer_lambda_arn" {
  value = aws_lambda_function.signer.arn
}

output "analytics_lambda_arn" {
  value = aws_lambda_function.analytics.arn
}

output "kpi_lambda_arn" {
  value = aws_lambda_function.kpi_engine.arn
}

output "processor_lambda_arn" {
  value = aws_lambda_function.processor.arn
}

output "processor_lambda_name" {
  value = aws_lambda_function.processor.function_name
}