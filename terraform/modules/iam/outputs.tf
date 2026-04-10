output "api_lambda_role_arn" {
  value = aws_iam_role.api_lambda_role.arn
}

output "invoice_processor_role_arn" {
  value = aws_iam_role.invoice_processor_role.arn
}

output "lambda_role_arn" {
  value = aws_iam_role.generic_lambda_role.arn
}