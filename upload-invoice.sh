#!/bin/bash

# --- CONFIGURACIÓN ---
REGION="eu-central-1"
CLIENT_ID="5uomoc3mlgo6h1cgk76j4pemja"
USER_POOL_ID="eu-central-1_LJE1bkULW"

# Nueva URL de tu AppSync
APPSYNC_URL="https://75nymxzbp5dddnsnehigmroili.appsync-api.eu-central-1.amazonaws.com/graphql"

TEST_FILE="./factura.pdf"

# Datos del Usuario
USERNAME="diego_liascovich"
PASSWORD="DLpdp1980!"
EMAIL="padie78@gmail.com"

echo "🚀 Iniciando proceso E2E con AppSync..."

# 1. Registro y Confirmación (Omitimos salida si ya existe)
aws cognito-idp sign-up --region $REGION --client-id $CLIENT_ID --username "$USERNAME" --password "$PASSWORD" --user-attributes Name=email,Value="$EMAIL" 2>/dev/null
aws cognito-idp admin-confirm-sign-up --region $REGION --user-pool-id $USER_POOL_ID --username "$USERNAME" 2>/dev/null

# 2. Login Dinámico
echo "🔑 Obteniendo Token..."
ID_TOKEN=$(aws cognito-idp initiate-auth \
    --region $REGION \
    --auth-flow USER_PASSWORD_AUTH \
    --client-id $CLIENT_ID \
    --auth-parameters USERNAME="$USERNAME",PASSWORD="$PASSWORD" \
    --query 'AuthenticationResult.IdToken' \
    --output text)

if [ "$ID_TOKEN" == "None" ] || [ -z "$ID_TOKEN" ]; then echo "❌ Error en Login"; exit 1; fi

# 3. Solicitud de Presigned URL vía AppSync (GraphQL)
echo "📡 Solicitando URL firmada a AppSync..."

# Definimos la mutación (usamos comillas simples para que las dobles no den guerra)
QUERY='mutation { getPresignedUrl(fileName: "factura.pdf", fileType: "application/pdf") { uploadURL } }'

# Usamos jq para construir un JSON perfecto y evitar el error "MalformedHttpRequest"
PAYLOAD=$(jq -n --arg q "$QUERY" '{query: $q}')

RESPONSE=$(curl -s -X POST "$APPSYNC_URL" \
    -H "Authorization: $ID_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

# Extraemos la URL
UPLOAD_URL=$(echo $RESPONSE | jq -r '.data.getPresignedUrl.uploadURL // empty')

if [ -z "$UPLOAD_URL" ] || [ "$UPLOAD_URL" == "null" ]; then
    echo "❌ Error en AppSync: $RESPONSE"
    exit 1
fi

echo "✅ URL recibida correctamente."

# 4. Upload a S3
echo "📤 Subiendo archivo a S3..."
UPLOAD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$UPLOAD_URL" \
    --upload-file "$TEST_FILE" \
    -H "Content-Type: application/pdf")

if [ "$UPLOAD_STATUS" == "200" ]; then
    echo "🎉 ¡ÉXITO! Archivo subido a S3."
else
    echo "❌ Error en S3. Status: $UPLOAD_STATUS"
fi