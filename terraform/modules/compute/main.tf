# --- EMPAQUETADO DE CÓDIGO ---

data "archive_file" "signer_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../../lambda_code/signer_lambda"
  output_path = "${path.module}/zips/signer.zip"
}

data "archive_file" "processor_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../../lambda_code/processor_lambda"
  output_path = "${path.module}/zips/processor.zip"
}

# --- LAMBDA 1: SIGNER (Genera URL para el Frontend) ---

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

# --- LAMBDA 2: PROCESSOR (Procesa con Bedrock y guarda en Dynamo) ---

resource "aws_lambda_function" "processor" {
  function_name = "${var.project_name}-processor-${var.environment}"
  filename      = data.archive_file.processor_zip.output_path
  handler       = "src/index.handler"
  runtime       = "nodejs20.x"
  role          = var.lambda_role_arn
  timeout       = 60 # Tiempo extra para llamadas a IA
  architectures = [var.lambda_architecture]

  environment {
    variables = {
      DYNAMO_TABLE      = var.dynamo_table_name
      BEDROCK_MODEL_ID  = var.bedrock_model_id
      EMISSIONS_API_URL = var.emissions_api_url
      EMISSIONS_API_KEY = var.emissions_api_key
    }
  }

  source_code_hash = data.archive_file.processor_zip.output_base64sha256
}