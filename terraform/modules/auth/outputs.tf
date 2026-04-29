output "user_pool_id" {
  description = "ID del User Pool"
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  description = "ARN del User Pool"
  value       = aws_cognito_user_pool.main.arn
}

output "client_id" {
  description = "ID del Cliente de Aplicación"
  value       = aws_cognito_user_pool_client.client.id
}

output "auth_domain" {
  description = "Dominio de autenticación configurado"
  value       = aws_cognito_user_pool_domain.main.domain
}