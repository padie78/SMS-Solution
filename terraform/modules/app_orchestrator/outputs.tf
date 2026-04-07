output "appsync_graphql_url" {
  description = "La URL del endpoint de GraphQL para el Analytics Hub"
  value       = aws_appsync_graphql_api.app_orchestrator.uris["GRAPHQL"]
}

output "appsync_api_key" {
  description = "La clave de API para acceso rápido (desarrollo)"
  value       = aws_appsync_api_key.hub_key.key
  sensitive   = true # Esto evita que la clave se imprima en texto plano en la consola
}

output "appsync_id" {
  description = "ID de la API de AppSync"
  value       = aws_appsync_graphql_api.app_orchestrator.id
}

output "appsync_arn" {
  description = "ARN de la API de AppSync"
  value       = aws_appsync_graphql_api.app_orchestrator.arn
}