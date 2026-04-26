# ==============================================================================
# 1. POLÍTICAS DE CONFIANZA (Assume Role)
# ==============================================================================
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# ==============================================================================
# 2. DEFINICIÓN DE ROLES (Dispatcher y Worker)
# ==============================================================================

# Este es el nuevo rol para la Lambda que recibe de S3 y manda a SQS
resource "aws_iam_role" "dispatcher_lambda_role" {
  name               = "${var.project_name}-dispatcher-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

# Este es el rol para la Lambda que consume de SQS y hace el OCR/IA
resource "aws_iam_role" "worker_lambda_role" {
  name               = "${var.project_name}-worker-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role" "api_lambda_role" {
  name               = "${var.project_name}-api-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role" "lambda_role" {
  name               = "${var.project_name}-generic-lambda-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

# ==============================================================================
# 3. POLÍTICAS DE PERMISOS (SQS, IA, S3, DYNAMO)
# ==============================================================================

# --- SQS: Dispatcher (Publish) ---
resource "aws_iam_policy" "dispatcher_sqs_publish" {
  name        = "${var.project_name}-dispatcher-sqs-publish-${var.environment}"
  description = "Permite enviar mensajes a la cola de facturas"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = "sqs:SendMessage"
      Effect   = "Allow"
      Resource = var.invoice_queue_arn # Usamos variable inyectada
    }]
  })
}

# --- SQS: Worker (Consume) ---
resource "aws_iam_policy" "worker_sqs_consume" {
  name        = "${var.project_name}-worker-sqs-consume-${var.environment}"
  description = "Permite leer y borrar mensajes de la cola"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
      Effect   = "Allow"
      Resource = var.invoice_queue_arn # Usamos variable inyectada
    }]
  })
}

# --- IA: Bedrock & Textract (Unificada para el Worker) ---
resource "aws_iam_policy" "ai_processing_policy" {
  name        = "${var.project_name}-ai-policy-${var.environment}"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["textract:DetectDocumentText", "textract:AnalyzeExpense", "textract:AnalyzeDocument"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = "bedrock:InvokeModel"
        Resource = [
          "arn:aws:bedrock:eu-central-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
          "arn:aws:bedrock:eu-central-1:*:inference-profile/eu.anthropic.claude-*"
        ]
      }
    ]
  })
}

# --- Storage: S3 Access ---
resource "aws_iam_policy" "s3_processing_policy" {
  name        = "${var.project_name}-s3-policy-${var.environment}"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:ListBucket", "s3:GetBucketLocation"]
      Resource = ["arn:aws:s3:::${var.project_name}-${var.environment}-uploads", "arn:aws:s3:::${var.project_name}-${var.environment}-uploads/*"]
    }]
  })
}

# --- Data: DynamoDB Access ---
resource "aws_iam_policy" "dynamo_app_policy" {
  name   = "${var.project_name}-dynamo-policy-${var.environment}"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:UpdateItem", "dynamodb:Query", "dynamodb:DeleteItem"]
      Resource = [var.dynamo_table_arn, "${var.dynamo_table_arn}/index/*"]
    }]
  })
}

# ==============================================================================
# 4. ATTACHMENTS (Vincular todo)
# ==============================================================================

# --- Logs para todos ---
resource "aws_iam_role_policy_attachment" "basic_execution" {
  for_each = toset([
    aws_iam_role.dispatcher_lambda_role.name,
    aws_iam_role.worker_lambda_role.name,
    aws_iam_role.api_lambda_role.name,
    aws_iam_role.lambda_role.name
  ])
  role       = each.value
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# --- Dispatcher: SQS Send ---
resource "aws_iam_role_policy_attachment" "dispatcher_sqs" {
  role       = aws_iam_role.dispatcher_lambda_role.name
  policy_arn = aws_iam_policy.dispatcher_sqs_publish.arn
}

# --- Worker: SQS Consume + IA + S3 + Dynamo ---
resource "aws_iam_role_policy_attachment" "worker_sqs" {
  role       = aws_iam_role.worker_lambda_role.name
  policy_arn = aws_iam_policy.worker_sqs_consume.arn
}
resource "aws_iam_role_policy_attachment" "worker_ai" {
  role       = aws_iam_role.worker_lambda_role.name
  policy_arn = aws_iam_policy.ai_processing_policy.arn
}
resource "aws_iam_role_policy_attachment" "worker_s3" {
  role       = aws_iam_role.worker_lambda_role.name
  policy_arn = aws_iam_policy.s3_processing_policy.arn
}
resource "aws_iam_role_policy_attachment" "worker_dynamo" {
  role       = aws_iam_role.worker_lambda_role.name
  policy_arn = aws_iam_policy.dynamo_app_policy.arn
}

# --- API Role: Dynamo + S3 ---
resource "aws_iam_role_policy_attachment" "api_dynamo" {
  role       = aws_iam_role.api_lambda_role.name
  policy_arn = aws_iam_policy.dynamo_app_policy.arn
}

# ==============================================================================
# 5. TRIGGERS (Event Source Mapping)
# ==============================================================================
# main.tf (RAÍZ) - Al final del archivo
resource "aws_lambda_event_source_mapping" "sqs_to_worker" {
  event_source_arn = module.invoice_process_queue.arn
  function_name    = module.compute.worker_lambda_arn
  batch_size       = 1
  enabled          = true
}