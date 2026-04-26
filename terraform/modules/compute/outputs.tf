# --- Outputs Nuevos (Recomendados) ---

output "dispatcher_lambda_arn" {
  description = "ARN de la Lambda que recibe eventos de S3"
  value       = aws_lambda_function.dispatcher_lambda.arn
}

output "worker_lambda_arn" {
  description = "ARN de la Lambda que procesa SQS (IA/OCR)"
  value       = aws_lambda_function.worker_lambda.arn
}

# --- Aliases de Compatibilidad (Para no romper el resto del código) ---

output "dispatcher_lambda_arn" {
  description = "Alias para dispatcher (mantiene compatibilidad con storage/iam)"
  value       = aws_lambda_function.dispatcher_lambda.arn
}

output "dispatcher_lambda_name" {
  value = aws_lambda_function.dispatcher_lambda.function_name
}

# --- Otros Outputs ---

output "api_lambda_arn" {
  value = aws_lambda_function.api_lambda.arn
}

output "signer_lambda_arn" {
  value = aws_lambda_function.signer.arn
}

# Agregá estos a los que ya tenías en modules/compute/outputs.tf

output "analytics_lambda_arn" {
  value = aws_lambda_function.analytics.arn
}

output "kpi_lambda_arn" {
  value = aws_lambda_function.kpi_engine.arn
}

# OJO AQUÍ: El role_id suele venir del módulo IAM, no de compute.
# Pero si tu módulo API lo pide de compute, exportalo así:
output "api_lambda_role_id" {
  value = var.api_lambda_role_arn # Pasamos el ARN o ID que entró por variable
}