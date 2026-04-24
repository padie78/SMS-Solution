# 1. Bucket S3 para Hosting Estático
resource "aws_s3_bucket" "webapp_bucket" {
  bucket = "${var.project_name}-${var.environment}-webapp-hosting"
  force_destroy = true # Útil en desarrollo para borrar el bucket con archivos dentro
}

# Configuración de Website (necesario para que S3 entienda index.html)
resource "aws_s3_bucket_website_configuration" "webapp_config" {
  bucket = aws_s3_bucket.webapp_bucket.id
  index_document { suffix = "index.html" }
  error_document { key = "index.html" } # Manejo de rutas de Angular
}

# 2. Origin Access Control (OAC)
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${var.project_name}-${var.environment}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# 3. Distribución de CloudFront
resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  origin {
    domain_name              = aws_s3_bucket.webapp_bucket.bucket_regional_domain_name
    origin_id                = "S3-Web-Origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-Web-Origin"

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
  }

  # Soporte para el Router de Angular (redirecciona 404 a index.html)
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "${var.project_name}-cdn"
    Environment = var.environment
  }
}

# 4. Política de Bucket para permitir acceso solo desde CloudFront
resource "aws_s3_bucket_policy" "allow_cloudfront" {
  bucket = aws_s3_bucket.webapp_bucket.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipalReadOnly"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.webapp_bucket.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.cdn.arn
          }
        }
      }
    ]
  })
}

# modules/frontend/main.tf (continuación)

resource "aws_s3_object" "config_json" {
  bucket       = aws_s3_bucket.webapp_bucket.id
  key          = "assets/config.json"
  content_type = "application/json"
  content      = jsonencode({
    appsync_url    = var.appsync_url
    appsync_region = var.appsync_region
    user_pool_id   = var.user_pool_id
    client_id      = var.client_id
  })
}