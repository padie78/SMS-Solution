# El rol del Worker (el que antes era processor)
output "invoice_processor_role_arn" {
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