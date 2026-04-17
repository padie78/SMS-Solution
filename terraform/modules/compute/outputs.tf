# ==============================================================================
# 1. OUTPUTS PARA LA LAMBDA SIGNER (S3 Presigned URLs)
# ==============================================================================
output "signer_lambda_arn" {
  description = "ARN de la función Lambda encargada de firmar URLs de S3"
  value       = aws_lambda_function.signer.arn
}

output "signer_lambda_name" {
  description = "Nombre de la función Lambda Signer"
  value       = aws_lambda_function.signer.function_name
}

# ==============================================================================
# 2. OUTPUTS PARA LA LAMBDA INVOICE PROCESSOR (IA & Pipeline)
# ==============================================================================
output "invoice_processor_arn" {
  description = "ARN de la función que procesa facturas con IA (Bedrock/Textract)"
  value       = aws_lambda_function.processor.arn
}

output "invoice_processor_name" {
  description = "Nombre de la función Invoice Processor"
  value       = aws_lambda_function.processor.function_name
}

# Mantengo estos alias para evitar romper el módulo storage que ya configuramos
output "processor_lambda_arn" {
  value = aws_lambda_function.processor.arn
}

output "processor_lambda_name" {
  value = aws_lambda_function.processor.function_name
}

# ==============================================================================
# 3. OUTPUTS PARA LA API_LAMBDA (CRUD / AppSync Mutation Handler)
# ==============================================================================
output "api_lambda_arn" {
  description = "ARN de la función encargada del CRUD y lógica de negocio para AppSync"
  value       = aws_lambda_function.api_lambda.arn
}

output "api_lambda_name" {
  description = "Nombre de la función API Lambda"
  value       = aws_lambda_function.api_lambda.function_name
}

# ==============================================================================
# 4. OUTPUTS PARA LA LAMBDA ANALYTICS (Procesamiento de Eventos)
# ==============================================================================
output "analytics_lambda_arn" {
  description = "ARN de la función Lambda que procesa eventos de Analytics"
  value       = aws_lambda_function.analytics.arn
}

output "analytics_lambda_name" {
  description = "Nombre de la función Lambda Analytics"
  value       = aws_lambda_function.analytics.function_name
}

output "kpi_lambda_arn" {
  description = "ARN de la función Lambda que calcula KPIs"
  value       = aws_lambda_function.kpi.arn
}

output "kpi_lambda_name" {
  description = "Nombre de la función Lambda KPI Engine"
  value       = aws_lambda_function.kpi.function_name
}
