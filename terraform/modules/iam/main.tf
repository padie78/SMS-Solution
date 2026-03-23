# 1. El "Trust Policy": Permite que el servicio Lambda use este rol
resource "aws_iam_role" "lambda_exec" {
  name = "${var.project_name}-${var.environment}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# Política para permitir la subida a S3 (PutObject)
resource "aws_iam_role_policy" "s3_policy" {
  name = "sms-platform-s3-upload-policy"
  role = aws_iam_role.lambda_exec.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action   = ["s3:PutObject"]
        Effect   = "Allow"
        Resource = "arn:aws:s3:::sms-platform-dev-uploads/*"
      }
    ]
  })
}

# Política básica para que las Lambdas escriban logs en CloudWatch
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Política de IA (Textract + Bedrock + GetObject)
resource "aws_iam_policy" "processor_ai_permissions" {
  name        = "${var.project_name}-processor-ai-policy-${var.environment}"
  description = "Permisos para que la Lambda use OCR e Inteligencia Artificial"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Permisos para Textract (DetectDocument y AnalyzeExpense)
        Effect   = "Allow"
        Action   = [
          "textract:DetectDocumentText",
          "textract:AnalyzeExpense"
        ]
        Resource = "*" 
      },
      {
        # Permiso específico para Claude 3 Haiku en Bedrock
        Effect   = "Allow"
        Action   = ["bedrock:InvokeModel"]
        Resource = "arn:aws:bedrock:eu-central-1::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
      },
      {
        # Permiso para leer los archivos que disparan el evento
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "arn:aws:s3:::${var.project_name}-${var.environment}-uploads/*"
      }
    ]
  })
}

# Adjuntar la política al Rol
resource "aws_iam_role_policy_attachment" "attach_ai_policy" {
  role       = aws_iam_role.lambda_exec.name 
  policy_arn = aws_iam_policy.processor_ai_permissions.arn
}

# Política adicional para asegurar AnalyzeExpense (Versión Inline)
resource "aws_iam_role_policy" "textract_extra_policy" {
  name = "textract-analyze-expense-policy"
  role = aws_iam_role.lambda_exec.name 

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["textract:AnalyzeExpense"]
        Resource = "*"
      }
    ]
  })
}