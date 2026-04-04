/**
 * @fileoverview Repository Layer - Capa de acceso a datos para DynamoDB.
 * Implementa el patrón de acceso optimizado para el proyecto SMS (Sustainability Management System).
 * Estructura: Single Table Design utilizando PK (ORG#ID) y SK (STATS# o INV#).
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

// Configuración del cliente DynamoDB con el SDK v3
const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.DYNAMO_TABLE;

export const repo = {
    /**
     * 1. DASHBOARD PRINCIPAL: Obtiene totales anuales pre-calculados.
     * Esta es la consulta más eficiente y económica (GetItem - O(1)).
     * @param {string} orgId - ID único de la organización (Partition Key).
     * @param {string} year - Año de los datos (Parte de la Sort Key).
     * @returns {Object|null} Objeto STATS con acumulados de CO2 y gasto.
     */
    getYearlyStats: async (orgId, year) => {
        const { Item } = await ddb.send(new GetCommand({
            TableName: TABLE,
            Key: { 
                PK: `ORG#${orgId}`, 
                SK: `STATS#${year}` 
            }
        }));
        return Item || null;
    },

    /**
     * 2. BUSCADOR POR VENDOR: Búsqueda indexada por Sort Key.
     * Aprovecha que el nombre del proveedor está al inicio de la SK para facturas.
     * @param {string} orgId - ID de la organización.
     * @param {string} vendorPrefix - Inicio del nombre del proveedor (ej: "GAS").
     * @returns {Array} Colección de ítems que coinciden con el prefijo.
     */
    getInvoicesByVendor: async (orgId, vendorPrefix) => {
        const { Items } = await ddb.send(new QueryCommand({
            TableName: TABLE,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: {
                ":pk": `ORG#${orgId}`,
                ":sk": `INV#${vendorPrefix.toUpperCase()}`
            }
        }));
        return Items || [];
    },

    /**
     * 3. MOTOR DE FILTROS AVANZADO: Búsqueda flexible multivariable.
     * Utiliza FilterExpressions para navegar en atributos anidados (Mapas 'M').
     * @param {string} orgId - ID de la organización.
     * @param {Object} filters - Criterios: year, month, service, minSpend, start/end.
     * @returns {Array} Facturas que cumplen con todos los criterios de filtrado.
     */
    searchInvoices: async (orgId, filters) => {
        // Inicializamos la expresión de filtrado obligatoria para registros de tipo factura
        let filterExpr = ["begins_with(SK, :inv)"];
        let exprValues = { ":pk": `ORG#${orgId}`, ":inv": "INV#" };

        // Filtrado por dimensiones analíticas (Mes/Año)
        if (filters.year) {
            filterExpr.push("analytics_dimensions.M.period_year.N = :y");
            exprValues[":y"] = filters.year.toString();
        }
        if (filters.month) {
            filterExpr.push("analytics_dimensions.M.period_month.N = :m");
            exprValues[":m"] = filters.month.toString();
        }

        // Filtrado por rubro (ELEC/GAS) definido por el análisis de IA
        if (filters.service) {
            filterExpr.push("ai_analysis.M.service_type.S = :s");
            exprValues[":s"] = filters.service.toUpperCase();
        }

        // Filtro económico: Facturas mayores o iguales a un monto
        if (filters.minSpend) {
            filterExpr.push("extracted_data.M.total_amount.N >= :minS");
            exprValues[":minS"] = filters.minSpend.toString();
        }

        // Filtro por rango de fechas del periodo de facturación real
        if (filters.start && filters.end) {
            filterExpr.push("extracted_data.M.billing_period.M.start.S BETWEEN :st AND :en");
            exprValues[":st"] = filters.start;
            exprValues[":en"] = filters.end;
        }

        const params = {
            TableName: TABLE,
            KeyConditionExpression: "PK = :pk",
            FilterExpression: filterExpr.join(" AND "),
            ExpressionAttributeValues: exprValues
        };

        const { Items } = await ddb.send(new QueryCommand(params));
        return Items || [];
    },

    /**
     * 4. AUDITORÍA: Identifica registros con baja fiabilidad.
     * Permite al frontend listar facturas que requieren supervisión humana.
     * @param {string} orgId - ID de la organización.
     * @param {number} threshold - Umbral de confianza (por defecto 0.8 / 80%).
     * @returns {Array} Facturas con puntaje de confianza IA bajo.
     */
    getLowConfidenceInvoices: async (orgId, threshold = 0.8) => {
        const { Items } = await ddb.send(new QueryCommand({
            TableName: TABLE,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :inv)",
            FilterExpression: "ai_analysis.M.confidence_score.N < :t",
            ExpressionAttributeValues: {
                ":pk": `ORG#${orgId}`, 
                ":inv": "INV#", 
                ":t": threshold.toString()
            }
        }));
        return Items || [];
    }
};