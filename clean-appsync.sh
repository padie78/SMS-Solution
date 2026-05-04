#!/bin/bash

# --- CONFIGURACIÓN ---
# Opción A: Pon tu ID manualmente (Lo más seguro si el nombre cambia)
API_ID="cw6lys5vxbffddtgd3d5idglfa" 
REGION="eu-central-1"

# Opción B: Si prefieres buscarlo por nombre (Descomenta la línea de abajo)
# API_ID=$(aws appsync list-graphql-apis --query "graphqlApis[?name=='tu-nombre-api'].apiId" --output text --region $REGION)

if [ -z "$API_ID" ] || [ "$API_ID" == "None" ]; then
    echo "❌ Error: No se pudo encontrar el API_ID. Por favor, edita el script y ponlo manualmente."
    exit 1
fi

echo "🚀 Iniciando limpieza profunda de la API: $API_ID en la región $REGION..."

# 1. ELIMINAR TODOS LOS RESOLVERS
echo "--- Eliminando Resolvers ---"
# Obtenemos los tipos (Mutation, Query, Subscription + Custom Types)
TYPES=$(aws appsync list-types --api-id $API_ID --format JSON --query 'types[].name' --output text --region $REGION)

for type in $TYPES; do
    # Listamos resolvers para cada tipo
    RESOLVERS=$(aws appsync list-resolvers --api-id $API_ID --type-name $type --query 'resolvers[].fieldName' --output text --region $REGION)
    for field in $RESOLVERS; do
        if [ "$field" != "None" ]; then
            echo "Eliminando Resolver: $type -> $field"
            aws appsync delete-resolver --api-id $API_ID --type-name $type --field-name $field --region $REGION || true
        fi
    done
done

# 2. ELIMINAR TODAS LAS FUNCIONES
echo "--- Eliminando Funciones ---"
FUNCTIONS=$(aws appsync list-functions --api-id $API_ID --query 'functions[].functionId' --output text --region $REGION)
for fnId in $FUNCTIONS; do
    if [ "$fnId" != "None" ]; then
        echo "Eliminando Function: $fnId"
        aws appsync delete-function --api-id $API_ID --function-id $fnId --region $REGION || true
    fi
done

# 3. ELIMINAR TODOS LOS DATA SOURCES
echo "--- Eliminando Data Sources ---"
DATASOURCES=$(aws appsync list-data-sources --api-id $API_ID --query 'dataSources[].name' --output text --region $REGION)
for ds in $DATASOURCES; do
    if [ "$ds" != "None" ]; then
        echo "Eliminando DataSource: $ds"
        aws appsync delete-data-source --api-id $API_ID --name "$ds" --region $REGION || true
    fi
done

# 4. RESETEAR EL SCHEMA (Opcional, pero recomendado para borrar Types)
echo "--- Reseteando Schema a estado mínimo ---"
echo "type Query { empty: String } schema { query: Query }" > schema_empty.graphql
aws appsync start-schema-creation --api-id $API_ID --definition fileb://schema_empty.graphql --region $REGION

echo "✅ AppSync $API_ID está limpio."