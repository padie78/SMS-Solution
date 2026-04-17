# ==============================================================================
# OUTPUTS DEL MÓDULO IAM
# ==============================================================================

# 1. ARN para la Lambda Processor (IA, S3, Textract, Dynamo)
output "invoice_processor_role_arn" {
  description = "ARN del rol para la Lambda de procesamiento de facturas"
  value       = aws_iam_role.invoice_processor_role.arn
}

# 2. ARN para la Lambda de la API (CRUD en DynamoDB)
output "api_lambda_role_arn" {
  description = "ARN del rol para la Lambda que maneja las peticiones de la API"
  value       = aws_iam_role.api_lambda_role.arn
}

# 3. ARN para el Rol Genérico (Utilizado por el Signer / S3)
output "lambda_role_arn" {
  description = "ARN del rol genérico con permisos para generar URLs firmadas"
  value       = aws_iam_role.generic_lambda_role.arn
}

output "lambda_role_name" {
  value = aws_iam_role.lambda_role.name # O el nombre que tenga tu recurso de rol
}

output "lambda_role_arn" {
  value = aws_iam_role.lambda_role.arn # O el ARN que tenga tu recurso de rol
}