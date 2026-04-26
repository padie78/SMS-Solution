# ==============================================================================
# 1. EMPAQUETADO DE CÓDIGO (ZIPs)
# ==============================================================================

# Lambda que recibe el evento de S3 y envía a SQS
data "archive_file" "dispatcher_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../lambda_code/dispatcher_lambda"
  output_path = "${path.module}/zips/dispatcher.zip"
}

# Lambda que procesa los mensajes de SQS (OCR, IA, DynamoDB)
data "archive_file" "worker_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../lambda_code/worker_lambda"
  output_path = "${path.module}/zips/worker.zip"
}

data "archive_file" "signer_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../lambda_code/signer_lambda"
  output_path = "${path.module}/zips/signer.zip"
}

data "archive_file" "api_lambda_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../lambda_code/api_lambda"
  output_path = "${path.module}/zips/api_lambda.zip"
}

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

# --- DISPATCHER: Gatillo de S3 ---
resource "aws_lambda_function" "dispatcher_lambda" {
  function_name = "${var.project_name}-dispatcher-${var.environment}"
  filename      = data.archive_file.dispatcher_zip.output_path
  handler       = "src/index.handler"
  runtime       = "nodejs20.x"
  role          = var.dispatcher_role_arn
  timeout       = 10
  memory_size   = 128
  architectures = [var.lambda_architecture]

  environment {
    variables = {
      SQS_QUEUE_URL = var.sqs_queue_url
      ENVIRONMENT   = var.environment
    }
  }
  source_code_hash = data.archive_file.dispatcher_zip.output_base64sha256
}

# --- WORKER: Procesador de SQS (Pesado) ---
resource "aws_lambda_function" "worker_lambda" {
  function_name = "${var.project_name}-worker-${var.environment}"
  filename      = data.archive_file.worker_zip.output_path
  handler       = "src/index.handler"
  runtime       = "nodejs20.x"
  role          = var.worker_role_arn
  timeout       = 300 # 5 minutos para Textract + Bedrock
  memory_size   = 512
  architectures = [var.lambda_architecture]

  environment {
    variables = {
      DYNAMO_TABLE      = var.dynamo_table_name
      BEDROCK_MODEL_ID  = var.bedrock_model_id
      EMISSIONS_API_URL = var.emissions_api_url
      EMISSIONS_API_KEY = var.emissions_api_key
      ENVIRONMENT       = var.environment
    }
  }
  source_code_hash = data.archive_file.worker_zip.output_base64sha256
}

# --- SIGNER: URLs de subida ---
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

# --- API: CRUD de GraphQL/AppSync ---
resource "aws_lambda_function" "api_lambda" {
  function_name = "${var.project_name}-api-${var.environment}"
  filename      = data.archive_file.api_lambda_zip.output_path
  handler       = "src/index.handler"
  runtime       = "nodejs20.x"
  role          = var.api_lambda_role_arn 
  timeout       = 15
  memory_size   = 256
  architectures = [var.lambda_architecture]

  environment {
    variables = {
      DYNAMO_TABLE = var.dynamo_table_name
    }
  }
  source_code_hash = data.archive_file.api_lambda_zip.output_base64sha256
}

# --- ANALYTICS & KPI ENGINE ---
resource "aws_lambda_function" "analytics" {
  function_name = "${var.project_name}-analytics-${var.environment}"
  filename      = data.archive_file.analytics_zip.output_path
  handler       = "src/index.handler"
  runtime       = "nodejs20.x"
  role          = var.api_lambda_role_arn
  timeout       = 20
  memory_size   = 512
  architectures = [var.lambda_architecture]

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
  role          = var.lambda_role_arn
  timeout       = 20
  memory_size   = 512
  architectures = [var.lambda_architecture]

  environment {
    variables = {
      DYNAMO_TABLE = var.dynamo_table_name
    }
  }
  source_code_hash = data.archive_file.kpi_zip.output_base64sha256
}

resource "aws_lambda_event_source_mapping" "sqs_to_worker" {
  event_source_arn = var.invoice_queue_arn
  function_name    = aws_lambda_function.worker_lambda.arn # <--- Verificá que se llame así
  batch_size       = 1
  enabled          = true

  # Opcional: Ayuda a que Terraform entienda el orden de creación
  depends_on = [aws_lambda_function.worker_lambda]
}
# ==============================================================================
# 3. OBSERVABILIDAD (Logs)
# ==============================================================================

resource "aws_cloudwatch_log_group" "dispatcher_logs" {
  name              = "/aws/lambda/${var.project_name}-dispatcher-${var.environment}"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "worker_logs" {
  name              = "/aws/lambda/${var.project_name}-worker-${var.environment}"
  retention_in_days = 14
}