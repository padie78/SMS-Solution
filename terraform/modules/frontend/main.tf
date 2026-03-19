resource "aws_s3_bucket" "frontend" {
  bucket = "${var.project_name}-frontend"
  acl    = "public-read"

  website {
    index_document = var.index_document
    error_document = var.error_document
  }

  tags = merge(
    { Project = var.project_name },
    var.extra_tags
  )
}