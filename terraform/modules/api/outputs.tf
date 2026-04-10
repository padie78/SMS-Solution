# ==============================================================================
# 1. ENDPOINTS Y ACCESO
# ==============================================================================
output "appsync_graphql_url" {
  description = "La URL del endpoint de GraphQL para el Hub de Sostenibilidad"
  value       = aws_appsync_graphql_api.api.uris["GRAPHQL"]
}

output "appsync_api_key" {
  description = "La clave de API para acceso rápido (desarrollo)"
  value       = aws_appsync_api_key.hub_key.key
  sensitive   = true 
}

# ==============================================================================
# 2. IDENTIFICADORES DE RECURSOS (Para el main.tf raíz)
# ==============================================================================
output "appsync_id" {
  description = "ID de la API de AppSync para vincular resolvers externos"
  value       = aws_appsync_graphql_api.api.id
}

# Alias de compatibilidad
output "appsync_api_id" {
  value = aws_appsync_graphql_api.api.id
}

output "appsync_arn" {
  description = "ARN de la API de AppSync"
  value       = aws_appsync_graphql_api.api.arn
}

output "appsync_url" {
  description = "La URL del endpoint de AppSync"
  value       = aws_appsync_graphql_api.api.uris["GRAPHQL"]
}

# ==============================================================================
# 3. DATA SOURCES (Nombres exactos para tus Resolvers)
# ==============================================================================
output "dynamodb_datasource_name" {
  description = "Nombre del Data Source de DynamoDB para resolvers UNIT (Analytics)"
  value       = aws_appsync_datasource.dynamodb_ds.name
}

output "api_lambda_datasource_name" {
  description = "Nombre del Data Source de la Lambda para Mutations (CRUD)"
  value       = aws_appsync_datasource.api_lambda_ds.name
}

output "signer_lambda_datasource_name" {
  description = "Nombre del Data Source de la Lambda Signer"
  value       = aws_appsync_datasource.signer_lambda_ds.name
}