# ==============================================================================
# 1. EMPAQUETADO DE CÓDIGO (ZIPs)
# ==============================================================================

data "archive_file" "signer_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../../lambda_code/signer_lambda"
  output_path = "${path.module}/zips/signer.zip"
}

data "archive_file" "processor_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../../lambda_code/processor_lambda"
  output_path = "${path.module}/zips/processor.zip"
}

data "archive_file" "analytics_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../../lambda_code/analytics_lambda"
  output_path = "${path.module}/zips/analytics.zip"
}

# ==============================================================================
# 2. CONFIGURACIÓN DE LAMBDAS
# ==============================================================================

# --- LAMBDA 1: SIGNER (Genera URL Firmadas para S3) ---
resource "aws_lambda_function" "signer" {
  function_name = "${var.project_name}-signer-${var.environment}"
  filename      = data.archive_file.signer_zip.output_path
  handler       = "src/index.handler"
  runtime       = "nodejs20.x"
  role          = var.lambda_role_arn
  architectures = [var.lambda_architecture]

  environment {
    variables = {
      UPLOAD_BUCKET = var.upload_bucket_name
    }
  }

  source_code_hash = data.archive_file.signer_zip.output_base64sha256
}

# --- LAMBDA 2: PROCESSOR (IA, OCR y Escritura en DynamoDB) ---
resource "aws_lambda_function" "processor" {
  function_name = "${var.project_name}-processor-${var.environment}"
  filename      = data.archive_file.processor_zip.output_path
  handler       = "src/index.handler"
  runtime       = "nodejs20.x"
  role          = var.lambda_role_arn
  timeout       = 60 
  memory_size   = 512 
  architectures = [var.lambda_architecture]

  logging_config {
    log_format = "JSON"
    log_group  = aws_cloudwatch_log_group.processor_logs.name
  }

  environment {
    variables = {
      DYNAMO_TABLE                        = var.dynamo_table_name
      BEDROCK_MODEL_ID                    = var.bedrock_model_id
      EMISSIONS_API_URL                   = var.emissions_api_url
      EMISSIONS_API_KEY                   = var.emissions_api_key
      AWS_NODEJS_CONNECTION_REUSE_ENABLED = "1"
    }
  }

  source_code_hash = data.archive_file.processor_zip.output_base64sha256
}

# --- LAMBDA 3: ANALYTICS (Lectura de métricas para el Dashboard) ---
resource "aws_lambda_function" "analytics" {
  # Este nombre coincide exactamente con lo que pide el outputs.tf
  function_name = "${var.project_name}-analytics-${var.environment}"
  filename      = data.archive_file.analytics_zip.output_path
  handler       = "src/index.handler"
  runtime       = "nodejs20.x"
  role          = var.lambda_role_arn
  timeout       = 30 
  memory_size   = 256
  architectures = [var.lambda_architecture]

  logging_config {
    log_format = "JSON"
    log_group  = aws_cloudwatch_log_group.analytics_logs.name
  }

  environment {
    variables = {
      DYNAMO_TABLE = var.dynamo_table_name
    }
  }

  source_code_hash = data.archive_file.analytics_zip.output_base64sha256
}

# ==============================================================================
# 3. OBSERVABILIDAD (CloudWatch Log Groups)
# ==============================================================================

resource "aws_cloudwatch_log_group" "signer_logs" {
  name              = "/aws/lambda/${var.project_name}-signer-${var.environment}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "processor_logs" {
  name              = "/aws/lambda/${var.project_name}-processor-${var.environment}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "analytics_logs" {
  name              = "/aws/lambda/${var.project_name}-analytics-${var.environment}"
  retention_in_days = 14
}