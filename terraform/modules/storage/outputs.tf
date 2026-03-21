# Este es el ID (nombre) del bucket que el módulo crea
output "bucket_id" {
  value = module.s3_bucket.s3_bucket_id
}

# El ARN del bucket
output "bucket_arn" {
  value = module.s3_bucket.s3_bucket_arn
}

# ESTA ES LA QUE TE DABA ERROR: 
# Cambiamos 'aws_s3_bucket.upload_bucket' por 'module.s3_bucket.s3_bucket_id'
output "bucket_name" {
  value = module.s3_bucket.s3_bucket_id 
}

# El endpoint del frontend (esto ya estaba bien)
output "frontend_bucket_url" {
  value = aws_s3_bucket_website_configuration.frontend_config.website_endpoint
}