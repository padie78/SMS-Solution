output "cloudfront_domain_name" {
  description = "Dominio de la distribución de CloudFront"
  value       = aws_cloudfront_distribution.s3_distribution.domain_name
}

output "cloudfront_distribution_id" {
  description = "ID de la distribución"
  value       = aws_cloudfront_distribution.s3_distribution.id
}

output "cloudfront_arn" {
  description = "ARN de la distribución para políticas de S3"
  value       = aws_cloudfront_distribution.s3_distribution.arn
}