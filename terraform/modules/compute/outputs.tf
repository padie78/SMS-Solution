# Outputs para la Lambda Signer
output "signer_lambda_arn" {
  description = "ARN de la función Signer"
  value       = aws_lambda_function.signer.arn
}

output "signer_lambda_name" {
  description = "Nombre de la función Signer"
  value       = aws_lambda_function.signer.function_name
}

# Outputs para la Lambda Processor
output "processor_lambda_arn" {
  description = "ARN de la función Processor"
  value       = aws_lambda_function.processor.arn
}

output "processor_lambda_name" {
  description = "Nombre de la función Processor"
  value       = aws_lambda_function.processor.function_name
}

# Alias para compatibilidad con tu módulo API actual (si lo requiere)
output "query_lambda_arn" {
  value = aws_lambda_function.processor.arn
}

output "query_lambda_name" {
  value = aws_lambda_function.processor.function_name
}