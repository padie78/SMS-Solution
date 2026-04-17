# ==============================================================================
# 1. POLÍTICAS DE CONFIANZA Y ACCESO S3
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

resource "aws_iam_policy" "signer_s3_permissions" {
  name        = "${var.project_name}-signer-s3-policy-${var.environment}"
  description = "Permite a la Lambda generar URLs firmadas para el bucket de uploads"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject"]
        Resource = ["arn:aws:s3:::${var.project_name}-${var.environment}-uploads/*"]
      }
    ]
  })
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
# 3. POLÍTICAS DE PERMISOS
# ==============================================================================

resource "aws_iam_policy" "processor_ai_permissions" {
  name        = "${var.project_name}-processor-ai-policy-${var.environment}"
  policy      = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:UpdateItem", "dynamodb:Query"]
        Resource = [var.dynamo_table_arn, "${var.dynamo_table_arn}/index/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["textract:DetectDocumentText", "textract:AnalyzeExpense", "textract:AnalyzeDocument"]
        Resource = "*" 
      },
      {
        Effect   = "Allow"
        Action   = ["bedrock:InvokeModel"]
        Resource = [
          "arn:aws:bedrock:eu-central-1:*:inference-profile/eu.anthropic.claude-*", 
          "arn:aws:bedrock:eu-*:*:foundation-model/anthropic.claude-*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::${var.project_name}-${var.environment}-uploads", 
          "arn:aws:s3:::${var.project_name}-${var.environment}-uploads/*"
        ]
      }
    ]
  })
}

resource "aws_iam_policy" "api_dynamo_permissions" {
  name   = "${var.project_name}-api-dynamo-policy-${var.environment}"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:UpdateItem", "dynamodb:Query", "dynamodb:DeleteItem"]
        Resource = [var.dynamo_table_arn, format("%s/index/*", var.dynamo_table_arn)]
      }
    ]
  })
}

# 1. Definición de la política de KMS (Usa el ID de la llave de tu error anterior)
resource "aws_iam_policy" "lambda_kms_permissions" {
  name        = "${var.project_name}-lambda-kms-policy-${var.environment}"
  description = "Permite a las lambdas desencriptar sus variables de entorno"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        # El ARN que aparecía en tu log de error
        Resource = "arn:aws:kms:eu-central-1:473959757331:key/f7e280f4-8c3c-4dec-bf7d-30d6fe708d64"
      }
    ]
  })
}

# 2. Adjuntar la política de KMS al lambda_role
resource "aws_iam_role_policy_attachment" "attach_lambda_kms" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_kms_permissions.arn
}

# ==============================================================================
# 4. ADJUNTAR POLÍTICAS (Attachments)
# ==============================================================================

# 1. Logs de CloudWatch para TODOS los roles
resource "aws_iam_role_policy_attachment" "logs" {
  for_each   = toset([
    aws_iam_role.invoice_processor_role.name, 
    aws_iam_role.api_lambda_role.name, 
    aws_iam_role.generic_lambda_role.name,
    aws_iam_role.lambda_role.name
  ])
  role       = each.value
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# 2. Permisos del Processor (IA + Data)
resource "aws_iam_role_policy_attachment" "attach_processor" {
  role       = aws_iam_role.invoice_processor_role.name
  policy_arn = aws_iam_policy.processor_ai_permissions.arn
}

# 3. Permisos de la API (Dynamo)
resource "aws_iam_role_policy_attachment" "attach_api" {
  role       = aws_iam_role.api_lambda_role.name
  policy_arn = aws_iam_policy.api_dynamo_permissions.arn
}

# 4. Permisos de S3 para el lambda_role (Signer) -
resource "aws_iam_role_policy_attachment" "attach_lambda_role_s3" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.signer_s3_permissions.arn
}

# 5. Permisos de DynamoDB para el lambda_role (KPI Engine)
resource "aws_iam_role_policy_attachment" "lambda_role_dynamo" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.api_dynamo_permissions.arn
}