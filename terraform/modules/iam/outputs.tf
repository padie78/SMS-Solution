output "invoice_dispatcher_role_arn" {
  value = aws_iam_role.worker_lambda_role.arn
}

output "worker_lambda_role_arn" {
  value = aws_iam_role.worker_lambda_role.arn
}

# El rol del Dispatcher
output "dispatcher_lambda_role_arn" {
  value = aws_iam_role.dispatcher_lambda_role.arn
}

# El rol de la API
output "api_lambda_role_arn" {
  value = aws_iam_role.api_lambda_role.arn
}

# Otros roles que tengas definidos
output "lambda_role_arn" {
  value = aws_iam_role.lambda_role.arn
}

# modules/iam/outputs.tf

output "lambda_role_name" {
  description = "Nombre del rol genérico para Lambdas"
  value       = aws_iam_role.lambda_role.name
}

# Aprovechá y confirmá que tenés estos otros por si la API los pide:
output "api_lambda_role_name" {
  value = aws_iam_role.api_lambda_role.name
}

output "worker_lambda_role_name" {
  value = aws_iam_role.worker_lambda_role.name
}