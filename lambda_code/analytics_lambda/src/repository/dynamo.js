/**
 * @fileoverview Repository Layer - Capa de acceso a datos para DynamoDB.
 * Implementa logs detallados para depuración de rutas y tipos de datos.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const ddb = DynamoDBDocumentClient.from(client);
const TABLE = process.env.DYNAMO_TABLE;

const formatPK = (id) => id.startsWith('ORG#') ? id : `ORG#${id}`;

export const repo = {
    /**
     * 1. DASHBOARD PRINCIPAL: Obtiene totales anuales.
     */
    getStats: async (orgId, year) => {
        const pk = formatPK(orgId);
        const sk = `STATS#${year}`;
        console.log(`[REPO][getStats] Buscando PK: ${pk}, SK: ${sk}`);

        try {
            const { Item } = await ddb.send(new GetCommand({
                TableName: TABLE,
                Key: { PK: pk, SK: sk }
            }));
            console.log(`[REPO][getStats] ${Item ? 'Item encontrado' : 'Item NO encontrado'}`);
            return Item || null;
        } catch (error) {
            console.error(`[REPO][getStats] ERROR:`, error.message);
            throw error;
        }
    },

    /**
     * 2. BUSCADOR POR VENDOR: Búsqueda indexada por Sort Key.
     */
    getInvoicesByVendor: async (orgId, vendorPrefix) => {
        const pk = formatPK(orgId);
        const skPrefix = `INV#${vendorPrefix.toUpperCase()}`;
        console.log(`[REPO][getByVendor] PK: ${pk}, SK prefix: ${skPrefix}`);

        try {
            const { Items } = await ddb.send(new QueryCommand({
                TableName: TABLE,
                KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
                ExpressionAttributeValues: { ":pk": pk, ":sk": skPrefix }
            }));
            console.log(`[REPO][getByVendor] Items encontrados: ${Items?.length || 0}`);
            return Items || [];
        } catch (error) {
            console.error(`[REPO][getByVendor] ERROR:`, error.message);
            throw error;
        }
    },

    /**
     * 3. MOTOR DE FILTROS AVANZADO: Corregido según estructura real del JSON.
     */
    searchInvoices: async (orgId, filters) => {
        console.log("--- [DEBUG START] searchInvoices ---");
        const finalPK = formatPK(orgId);
        
        console.log(`Config: { orgId: "${orgId}", finalPK: "${finalPK}", table: "${TABLE}" }`);
        console.log(`Filtros crudos recibidos:`, JSON.stringify(filters));

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
        
        // Filtro por Service - En ai_analysis.service_type
        if (filters.service) {
            console.log(`Agregando filtro Service: ${filters.service}`);
            filterParts.push("ai_analysis.service_type = :service");
            params.ExpressionAttributeValues[":service"] = filters.service.toUpperCase();
        }

        // Filtro por Año - En ai_analysis.year (Es un String "2026")
        if (filters.year) {
            console.log(`Agregando filtro Año: ${filters.year} (Tipo: ${typeof filters.year})`);
            filterParts.push("ai_analysis.#yr = :year");
            params.ExpressionAttributeNames["#yr"] = "year"; 
            params.ExpressionAttributeValues[":year"] = filters.year.toString();
        }

        // Filtro por Mes - En analytics_dimensions.period_month (Es un Número 4)
        if (filters.month) {
            console.log(`Agregando filtro Mes: ${filters.month} (Tipo: ${typeof filters.month})`);
            filterParts.push("analytics_dimensions.period_month = :month");
            params.ExpressionAttributeValues[":month"] = Number(filters.month);
        }

        if (filterParts.length > 0) {
            params.FilterExpression = filterParts.join(" AND ");
        }

        if (Object.keys(params.ExpressionAttributeNames).length === 0) {
            delete params.ExpressionAttributeNames;
        }

        console.log("Params finales enviados a DynamoDB:", JSON.stringify(params, null, 2));

        try {
            const result = await ddb.send(new QueryCommand(params));
            console.log(`DynamoDB Response: ${result.Items?.length || 0} items recuperados.`);

            if (result.Items && result.Items.length > 0) {
                const sample = result.Items[0];
                console.log("Muestra estructura primer item (para validar rutas):");
                console.log(`- SK: ${sample.SK}`);
                console.log(`- ai_analysis.year: ${sample.ai_analysis?.year} (Tipo: ${typeof sample.ai_analysis?.year})`);
                console.log(`- analytics_dimensions.period_month: ${sample.analytics_dimensions?.period_month} (Tipo: ${typeof sample.analytics_dimensions?.period_month})`);
            } else {
                console.warn("QUERY VACÍA: Verifica si los tipos de datos (String vs Number) en el FilterExpression coinciden con la tabla.");
            }

            console.log("--- [DEBUG END] searchInvoices ---");
            return result.Items || [];

        } catch (error) {
            console.error("--- [DEBUG ERROR] searchInvoices ---");
            console.error("Error completo:", error);
            throw error;
        }
    },

    /**
     * 4. AUDITORÍA: Corregido para DocumentClient (sin .M o .N).
     */
    getLowConfidenceInvoices: async (orgId, threshold = 0.9) => {
        const pk = formatPK(orgId);
        console.log(`[REPO][Auditoría] Iniciando con threshold: ${threshold} para PK: ${pk}`);

        const params = {
            TableName: TABLE,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :inv)",
            FilterExpression: "ai_analysis.confidence_score < :t",
            ExpressionAttributeValues: {
                ":pk": pk, 
                ":inv": "INV#", 
                ":t": Number(threshold)
            }
        };

        try {
            const { Items } = await ddb.send(new QueryCommand(params));
            console.log(`[REPO][Auditoría] Casos sospechosos encontrados: ${Items?.length || 0}`);
            return Items || [];
        } catch (error) {
            console.error(`[REPO][Auditoría] ERROR:`, error.message);
            throw error;
        }
    }
};