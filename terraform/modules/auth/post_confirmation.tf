# Lambda Post Confirmation: rellena custom:tenant_id al confirmar el registro (Id Token).
# Orden: IAM + Lambda (sin depender del ARN del pool en la política) → permiso → pool.lambda_config referencia la Lambda.

data "archive_file" "cognito_post_confirmation_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../lambda_code/post_confirmation_lambda"
  output_path = "${path.module}/zips/cognito_post_confirmation.zip"
  excludes    = [".git/**", ".github/**"]
}

resource "aws_iam_role" "cognito_post_confirmation" {
  name = "${var.project_name}-cognito-post-conf-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })

  tags = {
    Name        = "${var.project_name}-post-confirmation"
    Environment = var.environment
  }
}

# Evita dependencia circular Pool ↔ Lambda: no referenciamos el ARN del pool aquí.
resource "aws_iam_role_policy" "cognito_post_confirmation" {
  name = "cognito-admin-attributes"
  role = aws_iam_role.cognito_post_confirmation.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "UpdateUserAttributes"
        Effect   = "Allow"
        Action   = ["cognito-idp:AdminUpdateUserAttributes"]
        Resource = "*"
      },
      {
        Sid      = "Logging"
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_lambda_function" "cognito_post_confirmation" {
  function_name = "${var.project_name}-cognito-post-confirmation-${var.environment}"
  role          = aws_iam_role.cognito_post_confirmation.arn
  handler       = "src/index.handler"
  runtime       = "nodejs20.x"
  timeout       = 10
  architectures = ["arm64"]

  filename         = data.archive_file.cognito_post_confirmation_zip.output_path
  source_code_hash = data.archive_file.cognito_post_confirmation_zip.output_base64sha256

  environment {
    variables = {
      TENANT_ID_STRATEGY               = var.post_confirmation_tenant_strategy
      DEFAULT_ORGANIZATION_SCOPE_ID    = var.post_confirmation_default_organization_id
    }
  }

  depends_on = [aws_iam_role_policy.cognito_post_confirmation]
}

resource "aws_lambda_permission" "cognito_post_confirmation" {
  statement_id  = "AllowExecutionFromCognito"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cognito_post_confirmation.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}
