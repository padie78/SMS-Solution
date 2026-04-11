/**
 * @fileoverview Repository Layer - Capa de acceso a datos para DynamoDB.
 * Adaptado para soportar el Schema extendido de Sostenibilidad (KPIs, Auditoría, Forecast).
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const ddb = DynamoDBDocumentClient.from(client);
const s3Client = new S3Client({ region: process.env.AWS_REGION || "eu-central-1" });

const BUCKET_NAME = "sms-platform-dev-uploads";
const TABLE = "sms-platform-dev-emissions";

const formatPK = (id) => id.startsWith('ORG#') ? id : `ORG#${id}`;

/**
 * Helper para generar URLs firmadas de S3 de forma segura
 */
const generateSignedUrl = async (s3Key) => {
    if (!s3Key) return null;
    try {
        const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key });
        return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } catch (err) {
        console.error(`[S3_ERROR]:`, err.message);
        return null;
    }
};

export const repo = {
    /**
     * 1. STATS (Estratégico & KPIs Anuales/Mensuales)
     * Soporta: getYearlyKPI, getMonthlyKPI, getEvolution, getIntensity, getForecast
     */
    getStats: async (orgId, year) => {
        const pk = formatPK(orgId);
        console.log(`[REPO][getStats] Fetching stats for PK: ${pk}, Year: ${year}`); // Log de inicio de fetch
        try {
            const { Item } = await ddb.send(new GetCommand({
                TableName: TABLE,
                Key: { PK: pk, SK: `STATS#${year}#TOTAL` }
            }));
            console.log(`[REPO][getStats] Raw Item from DynamoDB:`, JSON.stringify(Item)); // Log del resultado crudo
            return Item || null;
        } catch (error) {
            console.error(`[REPO][getStats] ERROR:`, error.message);
            throw error;
        }
    },

    /**
     * 2. COMPARATIVA INTERANUAL (YoY)
     * Soporta: getYearOverYear
     */
    getStatsForYears: async (orgId, years = []) => {
        const pk = formatPK(orgId);
        try {
            const promises = years.map(year => 
                ddb.send(new GetCommand({
                    TableName: TABLE,
                    Key: { PK: pk, SK: `STATS#${year}` }
                }))
            );
            const results = await Promise.all(promises);
            return results.map(r => r.Item || null);
        } catch (error) {
            console.error(`[REPO][getStatsForYears] ERROR:`, error.message);
            throw error;
        }
    },

    /**
     * 3. GOBERNANZA Y AUDITORÍA
     * Soporta: getAuditReport, getAuditQueue, dataQualitySummary
     */
    getInvoicesForAudit: async (orgId, filters = {}) => {
        const pk = formatPK(orgId);
        const params = {
            TableName: TABLE,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: { ":pk": pk, ":sk": "INV#" }
        };

        let filterParts = [];
        if (filters.year) {
            filterParts.push("analytics_dimensions.period_year = :y");
            params.ExpressionAttributeValues[":y"] = Number(filters.year);
        }
        if (filters.month) {
            filterParts.push("analytics_dimensions.period_month = :m");
            params.ExpressionAttributeValues[":m"] = Number(filters.month);
        }
        if (filters.onlyRequiresReview) {
            filterParts.push("ai_analysis.requires_review = :r");
            params.ExpressionAttributeValues[":r"] = true;
        }

        if (filterParts.length > 0) params.FilterExpression = filterParts.join(" AND ");

        try {
            const { Items } = await ddb.send(new QueryCommand(params));
            // Mapeamos para incluir la URL del PDF solo en auditoría
            return await Promise.all((Items || []).map(async (item) => ({
                ...item,
                pdfUrl: await generateSignedUrl(item.metadata?.s3_key)
            })));
        } catch (error) {
            console.error(`[REPO][getInvoicesForAudit] ERROR:`, error.message);
            throw error;
        }
    },

    /**
     * 4. PROVEEDORES Y RANKING
     * Soporta: getVendorRanking
     */
    getYearlyInvoicesRaw: async (orgId, year) => {
        const pk = formatPK(orgId);
        const params = {
            TableName: TABLE,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            FilterExpression: "analytics_dimensions.period_year = :y",
            ExpressionAttributeValues: {
                ":pk": pk,
                ":sk": "INV#",
                ":y": Number(year)
            }
        };
        try {
            const { Items } = await ddb.send(new QueryCommand(params));
            return Items || [];
        } catch (error) {
            console.error(`[REPO][getYearlyInvoicesRaw] ERROR:`, error.message);
            throw error;
        }
    },

    /**
     * 5. METAS Y CONFIGURACIÓN
     * Soporta: getGoalTracking, getOffsetEstimation
     */
    getGoals: async (orgId, year) => {
        const pk = formatPK(orgId);
        try {
            const { Item } = await ddb.send(new GetCommand({
                TableName: TABLE,
                Key: { PK: pk, SK: `CONFIG#METAS#${year}` }
            }));
            return Item || null;
        } catch (error) {
            console.error(`[REPO][getGoals] ERROR:`, error.message);
            return null;
        }
    },

    /**
     * 6. EXPLORACIÓN (DataGrid Avanzado)
     * Soporta: searchInvoices
     */
    searchInvoices: async (orgId, filters) => {
        const pk = formatPK(orgId);
        const params = {
            TableName: TABLE,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
            ExpressionAttributeValues: { ":pk": pk, ":skPrefix": "INV#" }
        };

        let filterParts = [];
        if (filters.service) {
            filterParts.push("ai_analysis.service_type = :service");
            params.ExpressionAttributeValues[":service"] = filters.service.toUpperCase();
        }
        if (filters.year) {
            filterParts.push("analytics_dimensions.period_year = :year");
            params.ExpressionAttributeValues[":year"] = Number(filters.year);
        }
        if (filters.month) {
            filterParts.push("analytics_dimensions.period_month = :month");
            params.ExpressionAttributeValues[":month"] = Number(filters.month);
        }
        if (filters.minSpend) {
            filterParts.push("extracted_data.total_amount >= :minS");
            params.ExpressionAttributeValues[":minS"] = Number(filters.minSpend);
        }
        if (filters.maxSpend) {
            filterParts.push("extracted_data.total_amount <= :maxS");
            params.ExpressionAttributeValues[":maxS"] = Number(filters.maxSpend);
        }
        if (filters.minEmissions) {
            filterParts.push("climatiq_result.co2e >= :minE");
            params.ExpressionAttributeValues[":minE"] = Number(filters.minEmissions);
        }
        if (filters.maxEmissions) {
            filterParts.push("climatiq_result.co2e <= :maxE");
            params.ExpressionAttributeValues[":maxE"] = Number(filters.maxEmissions);
        }

        if (filterParts.length > 0) params.FilterExpression = filterParts.join(" AND ");

        try {
            const { Items } = await ddb.send(new QueryCommand(params));
            return await Promise.all((Items || []).map(async (item) => ({
                id: item.SK,
                vendor: item.extracted_data?.vendor || "N/A",
                invoiceDate: item.extracted_data?.invoice_date,
                totalAmount: item.extracted_data?.total_amount,
                emissions: item.climatiq_result?.co2e,
                consumption: item.ai_analysis?.value, // Nuevo: Mapeo del valor de consumo
                unit: item.ai_analysis?.unit,        // Nuevo: m3, kWh, etc.
                confidence: item.ai_analysis?.confidence_score,
                requiresReview: item.ai_analysis?.requires_review || false,
                service: item.ai_analysis?.service_type,
                pdfUrl: await generateSignedUrl(item.metadata?.s3_key)
            })));
        } catch (error) {
            console.error(`[REPO][searchInvoices] ERROR:`, error.message);
            throw error;
        }
    }
};