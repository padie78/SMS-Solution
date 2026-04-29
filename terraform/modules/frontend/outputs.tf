# ELIMINAR los que hacían referencia a cloudfront.cdn
# MANTENER solo los del bucket:

output "bucket_id" {
  value = aws_s3_bucket.webapp_bucket.id
}

output "bucket_arn" {
  value = aws_s3_bucket.webapp_bucket.arn
}

output "bucket_regional_domain_name" {
  value = aws_s3_bucket.webapp_bucket.bucket_regional_domain_name
}