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
# 2. DEFINICIÓN DE ROLES
# ==============================================================================

resource "aws_iam_role" "invoice_processor_role" {
  name               = "${var.project_name}-processor-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role" "api_lambda_role" {
  name               = "${var.project_name}-api-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role" "generic_lambda_role" {
  name               = "${var.project_name}-generic-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role" "lambda_role" {
  name               = "${var.project_name}-lambda-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

# ==============================================================================
# 3. POLÍTICAS DE PERMISOS REUTILIZABLES (Managed Policies)
# ==============================================================================

# --- IA: Bedrock Invoke ---
resource "aws_iam_policy" "bedrock_policy" {
  name        = "${var.project_name}-bedrock-policy-${var.environment}"
  description = "Permite invocar modelos de Claude en Bedrock"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "bedrock:InvokeModel"
      Resource = [
        "arn:aws:bedrock:eu-central-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0",
        "arn:aws:bedrock:eu-central-1:*:inference-profile/eu.anthropic.claude-*"
      ]
    }]
  })
}

# --- IA: Textract ---
resource "aws_iam_policy" "textract_policy" {
  name        = "${var.project_name}-textract-policy-${var.environment}"
  description = "Permite uso de Textract para OCR de facturas"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["textract:DetectDocumentText", "textract:AnalyzeExpense", "textract:AnalyzeDocument"]
      Resource = "*"
    }]
  })
}

# --- Storage: S3 Access ---
resource "aws_iam_policy" "s3_upload_policy" {
  name        = "${var.project_name}-s3-policy-${var.environment}"
  description = "Acceso al bucket de uploads para procesamiento"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::${var.project_name}-${var.environment}-uploads",
          "arn:aws:s3:::${var.project_name}-${var.environment}-uploads/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "processor_s3_and_ai" {
  name = "InvoiceProcessorS3AndAIPolicy"
  role = aws_iam_role.invoice_processor_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "AllowReadUploads"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::sms-platform-dev-uploads",
          "arn:aws:s3:::sms-platform-dev-uploads/*"
        ]
      },
      {
        Sid      = "AllowAI"
        Effect   = "Allow"
        Action   = [
          "textract:AnalyzeDocument",
          "textract:DetectDocumentText",
          "bedrock:InvokeModel"
        ]
        Resource = "*"
      }
    ]
  })
}

# --- Data: DynamoDB Full App Access ---
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

# --- Seguridad: KMS ---
resource "aws_iam_policy" "kms_policy" {
  name   = "${var.project_name}-kms-policy-${var.environment}"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["kms:Decrypt", "kms:DescribeKey", "kms:GenerateDataKey"]
      Resource = "*"
    }]
  })
}

# main_iam.tf
resource "aws_iam_policy" "s3_full_processing_policy" {
  name        = "${var.project_name}-s3-processing-policy-${var.environment}"
  description = "Permisos de lectura y metadatos para procesamiento de facturas"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "s3:GetObject", 
          "s3:ListBucket", 
          "s3:GetBucketLocation" # CRÍTICO para que el SDK no falle al validar la región
        ]
        Resource = [
          "arn:aws:s3:::sms-platform-dev-uploads",
          "arn:aws:s3:::sms-platform-dev-uploads/*"
        ]
      }
    ]
  })
}

# ==============================================================================
# 4. ASIGNACIÓN DE POLÍTICAS A ROLES (Attachments)
# ==============================================================================

# --- Logs de CloudWatch (Para todos los roles) ---
resource "aws_iam_role_policy_attachment" "basic_execution" {
  for_each = toset([
    aws_iam_role.invoice_processor_role.name,
    aws_iam_role.api_lambda_role.name,
    aws_iam_role.generic_lambda_role.name,
    aws_iam_role.lambda_role.name
  ])
  role       = each.value
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# --- PERMISOS PARA LA API LAMBDA (El rol que fallaba) ---
# Este rol necesita ejecutar el pipeline de IA directamente.
resource "aws_iam_role_policy_attachment" "api_bedrock" {
  role       = aws_iam_role.api_lambda_role.name
  policy_arn = aws_iam_policy.bedrock_policy.arn
}

resource "aws_iam_role_policy_attachment" "api_textract" {
  role       = aws_iam_role.api_lambda_role.name
  policy_arn = aws_iam_policy.textract_policy.arn
}

resource "aws_iam_role_policy_attachment" "api_s3" {
  role       = aws_iam_role.api_lambda_role.name
  policy_arn = aws_iam_policy.s3_upload_policy.arn
}

resource "aws_iam_role_policy_attachment" "api_dynamo" {
  role       = aws_iam_role.api_lambda_role.name
  policy_arn = aws_iam_policy.dynamo_app_policy.arn
}

# --- PERMISOS PARA EL PROCESSOR ROLE ---
resource "aws_iam_role_policy_attachment" "processor_bedrock" {
  role       = aws_iam_role.invoice_processor_role.name
  policy_arn = aws_iam_policy.bedrock_policy.arn
}

resource "aws_iam_role_policy_attachment" "processor_textract" {
  role       = aws_iam_role.invoice_processor_role.name
  policy_arn = aws_iam_policy.textract_policy.arn
}

resource "aws_iam_role_policy_attachment" "processor_s3" {
  role       = aws_iam_role.invoice_processor_role.name
  policy_arn = aws_iam_policy.s3_upload_policy.arn
}

# --- PERMISOS PARA EL LAMBDA ROLE (KPI ENGINE / OTHERS) ---
resource "aws_iam_role_policy_attachment" "lambda_kms" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.kms_policy.arn
}

resource "aws_iam_role_policy_attachment" "lambda_s3" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.s3_upload_policy.arn
}

resource "aws_iam_role_policy_attachment" "api_s3_processing" {
  role       = aws_iam_role.api_lambda_role.name
  policy_arn = aws_iam_policy.s3_full_processing_policy.arn
}

# Asegurar que tenga Textract (ya lo tienes, pero verifícalo)
resource "aws_iam_role_policy_attachment" "api_textract_full" {
  role       = aws_iam_role.api_lambda_role.name
  policy_arn = aws_iam_policy.textract_policy.arn
}