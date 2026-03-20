# Empaquetado independiente (Terraform se encarga de esto)
data "archive_file" "signer_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../lambda_code/signer_lambda"
  output_path = "${path.module}/zips/signer.zip"
}

data "archive_file" "processor_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../lambda_code/processor_lambda"
  output_path = "${path.module}/zips/processor.zip"
}

# Lambda 1: Signer (La que llama Angular)
resource "aws_lambda_function" "signer" {
  function_name = "${var.project_name}-signer-${var.environment}"
  filename      = data.archive_file.signer_zip.output_path
  handler       = "src/index.handler"
  runtime       = "nodejs20.x"
  role          = var.lambda_role_arn
  
  environment {
    variables = {
      UPLOAD_BUCKET = var.upload_bucket_name
    }
  }
}

# Lambda 2: Processor (La que dispara S3)
resource "aws_lambda_function" "processor" {
  function_name = "${var.project_name}-processor-${var.environment}"
  filename      = data.archive_file.processor_zip.output_path
  handler       = "src/index.handler"
  runtime       = "nodejs20.x"
  role          = var.lambda_role_arn
  timeout       = 60 # Fundamental para Bedrock/Textract

  environment {
    variables = {
      DYNAMO_TABLE      = var.dynamo_table_name
      BEDROCK_MODEL_ID  = var.bedrock_model_id
      EMISSIONS_API_URL = var.emissions_api_url
      EMISSIONS_API_KEY = var.emissions_api_key
    }
  }
}