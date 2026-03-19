output "lambda_role_arn" {
  value       = aws_iam_role.lambda_exec.arn
  description = "ARN del rol para que las Lambdas lo usen"
}