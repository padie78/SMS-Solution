# ==============================================================================
# 1. EMPAQUETADO DE CÓDIGO (ZIPs)
# ==============================================================================

data "archive_file" "signer_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../lambda_code/signer_lambda"
  output_path = "${path.module}/zips/signer.zip"
}

data "archive_file" "processor_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../lambda_code/processor_lambda"
  output_path = "${path.module}/zips/processor.zip"
}

data "archive_file" "api_lambda_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../lambda_code/api_lambda"
  output_path = "${path.module}/zips/api_lambda.zip"
}

# Nuevo empaquetado para la lógica de analíticas (YoY, KPIs, etc.)
data "archive_file" "analytics_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../lambda_code/analytics_lambda"
  output_path = "${path.module}/zips/analytics.zip"
}

data "archive_file" "kpi_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../lambda_code/kpi_engine_lambda"
  output_path = "${path.module}/zips/kpi.zip"
}

# ==============================================================================
# 2. CONFIGURACIÓN DE LAMBDAS
# ==============================================================================

# --- LAMBDA 1: SIGNER (Genera URL Firmadas) ---
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

# --- LAMBDA 2: PROCESSOR (IA, OCR y Escritura) ---
resource "aws_lambda_function" "processor" {
  function_name = "${var.project_name}-processor-${var.environment}"
  filename      = data.archive_file.processor_zip.output_path
  handler       = "src/index.handler"
  runtime       = "nodejs20.x"
  role          = var.processor_role_arn 
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

# --- LAMBDA 3: API_LAMBDA (CRUD / Mutations) ---
resource "aws_lambda_function" "api_lambda" {
  function_name = "${var.project_name}-api-${var.environment}"
  filename      = data.archive_file.api_lambda_zip.output_path
  handler       = "src/index.handler"
  runtime       = "nodejs20.x"
  role          = var.api_lambda_role_arn 
  timeout       = 10 
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

# --- LAMBDA 4: ANALYTICS (Consultas complejas de sostenibilidad) ---
resource "aws_lambda_function" "analytics" {
  function_name = "${var.project_name}-analytics-${var.environment}"
  filename      = data.archive_file.analytics_zip.output_path
  handler       = "src/index.handler"
  runtime       = "nodejs20.x"
  role          = var.api_lambda_role_arn # Reutilizamos el rol con permisos de Dynamo
  timeout       = 20
  memory_size   = 512
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

resource "aws_lambda_function" "kpi_engine" {
  function_name = "${var.project_name}-kpi-engine-${var.environment}"
  filename      = data.archive_file.kpi_zip.output_path
  handler       = "src/index.handler"
  runtime       = "nodejs20.x"
  role          = var.api_lambda_role_arn
  timeout       = 20
  memory_size   = 512
  architectures = [var.lambda_architecture]

  logging_config {
    log_format = "JSON"
    log_group  = aws_cloudwatch_log_group.kpi_engine_logs.name
  }

  environment {
    variables = {
      DYNAMO_TABLE = var.dynamo_table_name
    }
  }
  source_code_hash = data.archive_file.kpi_zip.output_base64sha256
}

# ==============================================================================
# 3. OBSERVABILIDAD
# ==============================================================================

resource "aws_cloudwatch_log_group" "processor_logs" {
  name              = "/aws/lambda/${var.project_name}-processor-${var.environment}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "api_lambda_logs" {
  name              = "/aws/lambda/${var.project_name}-api-${var.environment}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "analytics_logs" {
  name              = "/aws/lambda/${var.project_name}-analytics-${var.environment}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "kpi_engine_logs" {
  name              = "/aws/lambda/${var.project_name}-kpi-engine-${var.environment}"
  retention_in_days = 14
}