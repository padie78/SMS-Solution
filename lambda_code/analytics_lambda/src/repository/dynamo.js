/**
 * @fileoverview Repository Layer - Capa de acceso a datos para DynamoDB.
 * Implementa el patrón de acceso optimizado para el proyecto SMS (Sustainability Management System).
 * Estructura: Single Table Design utilizando PK (ORG#ID) y SK (STATS# o INV#).
 * * ACTUALIZACIÓN: Adaptado para seguridad Multi-tenant mediante inyección de orgId desde JWT.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

// Configuración del cliente DynamoDB con el SDK v3
const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.DYNAMO_TABLE;

/**
 * Normaliza el ID de la organización asegurando el prefijo del Single Table Design.
 * Evita duplicidad de prefijos si el token ya lo incluye.
 * @param {string} id - ID proveniente del contexto del autorizador.
 * @returns {string} PK formateada (ej: "ORG#123").
 */
const formatPK = (id) => id.startsWith('ORG#') ? id : `ORG#${id}`;

export const repo = {
    /**
     * 1. DASHBOARD PRINCIPAL: Obtiene totales anuales pre-calculados.
     * Patrón de acceso: Key Lookup (O(1)).
     * @param {string} orgId - ID validado de la organización.
     * @param {string} year - Año de los datos.
     */
    getStats: async (orgId, year) => {
        const { Item } = await ddb.send(new GetCommand({
            TableName: TABLE,
            Key: { 
                PK: formatPK(orgId), 
                SK: `STATS#${year}` 
            }
        }));
        return Item || null;
    },

    /**
     * 2. BUSCADOR POR VENDOR: Búsqueda indexada por Sort Key.
     * Utiliza la eficiencia de begins_with en la SK para filtrar proveedores rápidamente.
     * @param {string} orgId - ID de la organización.
     * @param {string} vendorPrefix - Prefijo del proveedor para la SK.
     */
    getInvoicesByVendor: async (orgId, vendorPrefix) => {
        const { Items } = await ddb.send(new QueryCommand({
            TableName: TABLE,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: {
                ":pk": formatPK(orgId),
                ":sk": `INV#${vendorPrefix.toUpperCase()}`
            }
        }));
        return Items || [];
    },

    /**
     * 3. MOTOR DE FILTROS AVANZADO: Búsqueda flexible multivariable.
     * Aplica filtros sobre atributos anidados (Maps) tras la recuperación de la PK.
     * @param {string} orgId - ID de la organización.
     * @param {Object} filters - Criterios de búsqueda (year, month, service, etc).
     */
    /**
     * 3. MOTOR DE FILTROS AVANZADO (Versión Final corregida)
     */
    searchInvoices: async (orgId, filters) => {
        console.log("--- [REPO START] searchInvoices ---");
        
        // Logueamos la identidad que recibimos y cómo se transforma
        const finalPK = formatPK(orgId);
        console.log(`Identidad Recibida (orgId): "${orgId}"`);
        console.log(`PK Generada para Query: "${finalPK}"`);
        console.log(`Filtros Aplicados:`, JSON.stringify(filters));
        
        const params = {
            TableName: TABLE,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
            ExpressionAttributeValues: {
                ":pk": finalPK,
                ":skPrefix": "INV#" 
            },
            ExpressionAttributeNames: {}
        };

        let filterParts = [];
        
        // Filtro por Service
        if (filters.service) {
            filterParts.push("ai_analysis.service_type = :service");
            params.ExpressionAttributeValues[":service"] = filters.service;
        }

        // Filtro por campos con alias (#yr y #mo)
        if (filters.year) {
            filterParts.push("extracted_data.#yr = :year");
            params.ExpressionAttributeNames["#yr"] = "year"; 
            params.ExpressionAttributeValues[":year"] = filters.year;
        }

        if (filters.month) {
            filterParts.push("extracted_data.#mo = :month");
            params.ExpressionAttributeNames["#mo"] = "month";
            params.ExpressionAttributeValues[":month"] = filters.month;
        }

        if (filterParts.length > 0) {
            params.FilterExpression = filterParts.join(" AND ");
        }

        if (Object.keys(params.ExpressionAttributeNames).length === 0) {
            delete params.ExpressionAttributeNames;
        }

        console.log("DynamoDB Params Finales:", JSON.stringify(params, null, 2));

        try {
            const result = await ddb.send(new QueryCommand(params));
            
            console.log(`Resultado DynamoDB: ${result.Items?.length || 0} items encontrados.`);

            if (result.Items && result.Items.length > 0) {
                console.log("Muestra del primer item (Estructura real):", JSON.stringify(result.Items[0], null, 2));
            } else {
                console.warn(`AVISO: La PK "${finalPK}" con prefijo "INV#" no devolvió resultados.`);
            }

            console.log("--- [REPO END] searchInvoices ---");
            return result.Items || [];

        } catch (error) {
            console.error("--- [REPO ERROR] Falló la Query a DynamoDB ---");
            console.error("Mensaje de error:", error.message);
            throw error;
        }
    },

    /**
     * 4. AUDITORÍA: Identifica registros con baja confianza de IA.
     * @param {string} orgId - ID de la organización.
     * @param {number} threshold - Score de corte para auditoría.
     */
    getLowConfidenceInvoices: async (orgId, threshold = 0.8) => {
        const { Items } = await ddb.send(new QueryCommand({
            TableName: TABLE,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :inv)",
            FilterExpression: "ai_analysis.M.confidence_score.N < :t",
            ExpressionAttributeValues: {
                ":pk": formatPK(orgId), 
                ":inv": "INV#", 
                ":t": threshold.toString()
            }
        }));
        return Items || [];
    }
};