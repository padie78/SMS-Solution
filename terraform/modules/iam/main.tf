# 1. Trust Policy base (Reutilizable para todos los roles de Lambda)
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# 2. ROL 1: PROCESSOR (El "Pesado": IA, S3, Textract, Dynamo)
resource "aws_iam_role" "invoice_processor_role" {
  name               = "${var.project_name}-processor-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

# 3. ROL 2: API LAMBDA (El "Ligero": Solo DynamoDB)
resource "aws_iam_role" "api_lambda_role" {
  name               = "${var.project_name}-api-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

# 4. ROL 3: GENÉRICO (Para el Signer u otras utilidades)
resource "aws_iam_role" "generic_lambda_role" {
  name               = "${var.project_name}-generic-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

# 5. POLÍTICA INTEGRAL PARA EL PROCESSOR (IA + S3 + Textract + Dynamo)
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
        Resource = ["arn:aws:bedrock:eu-central-1:*:inference-profile/eu.anthropic.claude-*", "arn:aws:bedrock:eu-*:*:foundation-model/anthropic.claude-*"]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
        Resource = ["arn:aws:s3:::${var.project_name}-${var.environment}-uploads", "arn:aws:s3:::${var.project_name}-${var.environment}-uploads/*"]
      }
    ]
  })
}

# 6. POLÍTICA SOLO DYNAMO PARA LA API LAMBDA (Principio de menor privilegio)
resource "aws_iam_policy" "api_dynamo_permissions" {
  name   = "${var.project_name}-api-dynamo-policy-${var.environment}"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "dynamodb:PutItem", 
          "dynamodb:GetItem", 
          "dynamodb:UpdateItem", 
          "dynamodb:Query", 
          "dynamodb:DeleteItem"
        ]
        # Usamos format para asegurar que la estructura sea limpia
        Resource = [
          var.dynamo_table_arn,
          format("%s/index/*", var.dynamo_table_arn)
        ]
      }
    ]
  })
}

# 7. ADJUNTAR POLÍTICAS
# Logs para todos
resource "aws_iam_role_policy_attachment" "logs" {
  for_each   = toset([aws_iam_role.invoice_processor_role.name, aws_iam_role.api_lambda_role.name, aws_iam_role.generic_lambda_role.name])
  role       = each.value
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Permisos específicos
resource "aws_iam_role_policy_attachment" "attach_processor" {
  role       = aws_iam_role.invoice_processor_role.name
  policy_arn = aws_iam_policy.processor_ai_permissions.arn
}

resource "aws_iam_role_policy_attachment" "attach_api" {
  role       = aws_iam_role.api_lambda_role.name
  policy_arn = aws_iam_policy.api_dynamo_permissions.arn
}