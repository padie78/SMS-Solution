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

# 4. Sincronizado con tu GitHub Action (BUCKET)
output "s3_bucket_name" {
  value = module.frontend_storage.bucket_id 
}

# 5. Sincronizado con tu GitHub Action (DIST_ID)
output "cloudfront_distribution_id" {
  value = module.frontend_cdn.cloudfront_distribution_id
}

# 6. La URL final de tu aplicación de Sostenibilidad
output "app_url" {
  value = module.frontend_cdn.cloudfront_domain_name
}