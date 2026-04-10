# ==============================================================================
# 1. ENDPOINTS Y ACCESO
# ==============================================================================
output "appsync_graphql_url" {
  description = "La URL del endpoint de GraphQL para el Hub de Sostenibilidad"
  value       = aws_appsync_graphql_api.app_orchestrator.uris["GRAPHQL"]
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
  value       = aws_appsync_graphql_api.app_orchestrator.id
}

# Alias de compatibilidad (por si el main.tf usa appsync_api_id)
output "appsync_api_id" {
  value = aws_appsync_graphql_api.app_orchestrator.id
}

output "appsync_arn" {
  description = "ARN de la API de AppSync"
  value       = aws_appsync_graphql_api.app_orchestrator.arn
}

# ==============================================================================
# 3. DATA SOURCES (Vital para Resolvers Directos)
# ==============================================================================
output "dynamodb_datasource_name" {
  description = "Nombre del Data Source de DynamoDB para resolvers UNIT (Analytics)"
  value       = aws_appsync_datasource.dynamodb_ds.name
}

output "api_lambda_datasource_name" {
  description = "Nombre del Data Source de la Lambda para Mutations (CRUD)"
  value       = aws_appsync_datasource.api_lambda_ds.name
}