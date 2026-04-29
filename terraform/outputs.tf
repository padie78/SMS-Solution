# /outputs.tf (RAÍZ)

# 1. El bucket donde subes las facturas (procesamiento)
output "upload_bucket_name" { 
  value = module.storage.bucket_id 
}

# 2. La base de datos de emisiones
output "dynamo_table_name" { 
  value = module.database.table_name 
}

# 3. El endpoint de AppSync para tu Frontend
output "api_endpoint" { 
  value = module.api.appsync_url 
}

# 4. El bucket que hace el hosting de la App Angular
output "frontend_s3_bucket" {
  # Cambiamos 'module.frontend' por el nombre real de tu módulo de storage
  value = module.frontend_storage.bucket_id 
}

# 5. El ID de CloudFront (Para invalidar caché en el deploy)
output "cloudfront_id" {
  # Cambiamos 'module.frontend' por el nombre del módulo de CDN
  value = module.frontend_cdn.cloudfront_distribution_id
}

# 6. La URL final de tu aplicación de Sostenibilidad
output "app_url" {
  value = module.frontend_cdn.cloudfront_domain_name
}