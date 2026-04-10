# 1. El User Pool (Donde viven los usuarios)
resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-${var.environment}-user-pool"

  # Permitir entrar con Email en lugar de Username (Estándar SaaS)
  alias_attributes         = ["email"]
  auto_verified_attributes = ["email"]

  # Configuración de Password (ajustala según necesites)
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  # Verificación por Email
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Tu código de verificación para SMS"
    email_message        = "Hola! Tu código de verificación es {####}."
  }

  schema {
    attribute_data_type = "String"
    name                = "email"
    required            = true
    mutable             = true
  }
}

# 2. El Client (Lo que el Frontend o Postman usarán)
# 2. El Client (Lo que el Frontend o Postman usarán)
resource "aws_cognito_user_pool_client" "client" {
  name         = "${var.project_name}-${var.environment}-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # Flujos de autenticación permitidos
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_ADMIN_USER_PASSWORD_AUTH"
  ]

  # --- SOLUCIÓN AL ERROR DE RANGO ---
  # Definimos tiempos estándar: 24h para acceso e ID, 30 días para refresh
  refresh_token_validity = 30
  access_token_validity  = 24
  id_token_validity      = 24

  # Es fundamental definir las unidades para que AWS no se confunda
  token_validity_units {
    refresh_token = "days"
    access_token  = "hours"
    id_token      = "hours"
  }
  # ----------------------------------

  prevent_user_existence_errors = "ENABLED"
}

# 3. (Opcional) Dominio para Cognito si usan el Hosted UI
resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project_name}-${var.environment}-auth"
  user_pool_id = aws_cognito_user_pool.main.id
}