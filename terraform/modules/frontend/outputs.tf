output "cloudfront_domain" {
  description = "URL para acceder a la aplicación de sustentabilidad"
  value       = aws_cloudfront_distribution.cdn.domain_name
}

output "s3_bucket_name" {
  value = aws_s3_bucket.webapp_bucket.id
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.cdn.id
}

output "bucket_id" {
  value = aws_s3_bucket.webapp_bucket.id
}

output "bucket_arn" {
  value = aws_s3_bucket.webapp_bucket.arn
}

output "bucket_regional_domain_name" {
  value = aws_s3_bucket.webapp_bucket.bucket_regional_domain_name
}