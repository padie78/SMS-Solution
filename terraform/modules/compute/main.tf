module "lambda_extractor" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 6.0"

  function_name = "${var.project_name}-${var.environment}-extractor"
  handler       = var.extractor_handler
  runtime       = var.lambda_runtime
  architectures = [var.lambda_architecture]

  source_path   = var.lambda_source_path
  timeout       = var.extractor_timeout
  memory_size   = var.extractor_memory

  environment_variables = {
    DYNAMO_TABLE     = var.dynamo_table_name
    EXTERNAL_API_URL = var.external_api_url
    ENVIRONMENT      = var.environment
  }

  attach_policy_statements = true
  policy_statements = {
    ai = {
      effect    = "Allow"
      actions   = ["textract:AnalyzeDocument", "bedrock:InvokeModel"]
      resources = var.allowed_ai_models # Parametrizamos los modelos permitidos
    },
    s3 = {
      effect    = "Allow"
      actions   = ["s3:GetObject"]
      resources = ["${var.upload_bucket_arn}/*"]
    },
    dynamo = {
      effect    = "Allow"
      actions   = ["dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:GetItem"]
      resources = [var.dynamo_table_arn]
    }
  }

  allowed_triggers = {
    S3Post = {
      service    = "s3"
      source_arn = var.upload_bucket_arn
    }
  }
}