# 1. Bucket S3 para Hosting Estático
resource "aws_s3_bucket" "webapp_bucket" {
  bucket        = "${var.project_name}-${var.environment}-webapp-hosting"
  force_destroy = true 
}

resource "aws_s3_bucket_website_configuration" "webapp_config" {
  bucket = aws_s3_bucket.webapp_bucket.id
  index_document { suffix = "index.html" }
  error_document { key = "index.html" }
}

# 2. Política de Bucket (Actualizada para usar el output del módulo)
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
            # Referenciamos el output del módulo que creamos antes
            "AWS:SourceArn" = module.frontend_cdn.cloudfront_arn 
          }
        }
      }
    ]
  })
}

# 3. Generación del config.json (Esto se queda igual)
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