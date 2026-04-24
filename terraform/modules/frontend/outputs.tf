output "cloudfront_domain" {
  description = "URL para acceder a la aplicación de sustentabilidad"
  value       = aws_cloudfront_distribution.cdn.domain_name
}

output "s3_bucket_name" {
  value = aws_s3_bucket.webapp_bucket.id
}