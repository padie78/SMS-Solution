# ==============================================================================
# 4. RESOLVERS (CORREGIDOS Y ADAPTADOS)
# ==============================================================================

# --- BLOQUE DE MUTACIONES (Escritura y Configuración) ---
# Todas estas deben ser "Mutation" para coincidir con tu schema.graphql
resource "aws_appsync_resolver" "mutation_resolvers" {
  for_each = toset([
    "saveOrgConfig",
    "saveUserProfile",
    "createBranch",
    "updateBranch",
    "saveBranchConfig",
    "createAsset",
    "deleteAsset",
    "saveCostCenter",
    "saveUtilityTariff",
    "saveInvoiceReading", # <--- Ya no fallará el Paso 5.5
    "logProduction",
    "approveInvoice"
  ])

  api_id      = aws_appsync_graphql_api.api.id
  type        = "Mutation"
  field       = each.key
  data_source = aws_appsync_datasource.api_lambda_ds.name # Tu orquestador principal
}

# --- BLOQUE DE QUERIES (Lectura y Analítica) ---
# Estas son las que se definen bajo "type Query" en tu schema
resource "aws_appsync_resolver" "kpi_resolvers" {
  for_each = toset([
    "getYearlyKPI",
    "getMonthlyKPI",
    "getIntensityReport",
    "getInvoicesByPeriod",
    "getCostCenters"
  ])

  api_id      = aws_appsync_graphql_api.api.id
  type        = "Query"
  field       = each.key
  data_source = aws_appsync_datasource.analytics_lambda_ds.name 

  depends_on = [aws_appsync_datasource.analytics_lambda_ds]

  lifecycle {
    create_before_destroy = true
  }
}

# --- RESOLVER DE FIRMA S3 ---
resource "aws_appsync_resolver" "get_url_resolver" {
  api_id      = aws_appsync_graphql_api.api.id
  type        = "Mutation"
  field       = "getPresignedUrl" 
  data_source = aws_appsync_datasource.signer_lambda_ds.name
}

# ==============================================================================
# 5. POLÍTICA DE ACCESO (Validada)
# ==============================================================================
resource "aws_iam_role_policy" "appsync_access_policy" {
  name = "AppSyncAccessPolicy"
  role = aws_iam_role.appsync_runtime_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "AllowLambdaInvocation"
        Action   = ["lambda:InvokeFunction"]
        Effect   = "Allow"
        Resource = [
          var.api_lambda_arn,
          "${var.api_lambda_arn}:*",
          var.signer_lambda_arn,
          "${var.signer_lambda_arn}:*",
          var.analytics_lambda_arn,
          "${var.analytics_lambda_arn}:*"
        ]
      },
      {
        Sid      = "AllowDynamoAccess"
        Action   = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:BatchGetItem"
        ]
        Effect   = "Allow"
        Resource = [
          var.dynamo_table_arn,
          "${var.dynamo_table_arn}/index/*"
        ]
      }
    ]
  })
}