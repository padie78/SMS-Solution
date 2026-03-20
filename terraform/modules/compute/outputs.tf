# modules/compute/outputs.tf
output "signer_lambda_arn" {
  value = aws_lambda_function.signer.arn
}

output "signer_lambda_name" {
  value = aws_lambda_function.signer.function_name
}

# (Y lo mismo para la query_lambda que ya tenías)