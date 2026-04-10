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

data "archive_file" "api_lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../../lambda_code/api_lambda"
  output_path = "${path.module}/zips/api_lambda.zip"
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

# --- LAMBDA 3: API_LAMBDA (CRUD / Mutations para AppSync) ---
resource "aws_lambda_function" "api_lambda" {
  function_name = "${var.project_name}-api-lambda-${var.environment}"
  filename      = data.archive_file.api_lambda_zip.output_path
  handler       = "src/index.handler"
  runtime       = "nodejs20.x"
  role          = var.api_lambda_role_arn
  timeout       = 10 # CRUD debe ser rápido
  memory_size   = 256
  architectures = [var.lambda_architecture]

  logging_config {
    log_format = "JSON"
    log_group  = aws_cloudwatch_log_group.api_lambda_logs.name
  }

  environment {
    variables = {
      DYNAMO_TABLE = var.dynamo_table_name
    }
  }

  source_code_hash = data.archive_file.api_lambda_zip.output_base64sha256
}

# ==============================================================================
# 3. OBSERVABILIDAD (CloudWatch Log Groups)
# ==============================================================================

resource "aws_cloudwatch_log_group" "processor_logs" {
  name              = "/aws/lambda/${var.project_name}-processor-${var.environment}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "analytics_logs" {
  name              = "/aws/lambda/${var.project_name}-analytics-${var.environment}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "api_lambda_logs" {
  name              = "/aws/lambda/${var.project_name}-api-lambda-${var.environment}"
  retention_in_days = 14
}