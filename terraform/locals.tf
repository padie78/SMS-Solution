locals {
  # Definimos el prefijo estándar para todo el proyecto SMS
  resource_prefix = "${var.project_name}-${var.environment}"

  # Construimos los nombres específicos
  table_name  = "${local.resource_prefix}-table"
  bucket_name = "${local.resource_prefix}-upload-bucket"
  api_name    = "${local.resource_prefix}-api"
}