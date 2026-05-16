# Bucket S3 para hosting estático (Angular). Lectura solo vía CloudFront OAC (policy en main.tf).
resource "aws_s3_bucket" "webapp_bucket" {
  bucket        = "${var.project_name}-${var.environment}-webapp-hosting"
  force_destroy = true

  tags = {
    Name        = "${var.project_name}-${var.environment}-webapp"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "webapp_public_access_block" {
  bucket = aws_s3_bucket.webapp_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_website_configuration" "webapp_config" {
  bucket = aws_s3_bucket.webapp_bucket.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

# Config runtime para Amplify/AppSync (CI no debe borrarlo: excluir en sync o re-subir tras deploy)
resource "aws_s3_object" "config_json" {
  bucket       = aws_s3_bucket.webapp_bucket.id
  key          = "assets/config.json"
  content_type = "application/json"
  content = jsonencode({
    appsync_url    = var.appsync_url
    appsync_region = var.appsync_region
    user_pool_id   = var.user_pool_id
    client_id      = var.client_id
  })

  depends_on = [aws_s3_bucket_public_access_block.webapp_public_access_block]
}
