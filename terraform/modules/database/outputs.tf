output "table_name" {
  description = "Nombre de la tabla DynamoDB"
  value       = aws_dynamodb_table.emissions_table.name
}

output "table_arn" {
  description = "ARN de la tabla DynamoDB"
  value       = aws_dynamodb_table.emissions_table.arn
}

output "table_stream_arn" {
  # Asegúrate de que el nombre coincida con el recurso de tu tabla (ej: emissions_table)
  value = aws_dynamodb_table.emissions_table.stream_arn
}