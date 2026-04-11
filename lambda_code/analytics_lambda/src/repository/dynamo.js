/**
 * @fileoverview Repository Layer - Capa de acceso a datos para DynamoDB.
 * Genérico y flexible para soportar Sort Keys dinámicas.
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
     * 1. STATS (Estratégico & KPIs)
     * Ahora recibe la 'sk' completa (ej: STATS#YEAR#2026#TOTAL)
     */
    getStats: async (orgId, sk) => {
        const pk = formatPK(orgId);
        // El log ahora nos mostrará la llave completa que fallaba antes
        console.log(`[REPO][getStats] Fetching PK: ${pk}, SK: ${sk}`); 
        
        try {
            const { Item } = await ddb.send(new GetCommand({
                TableName: TABLE,
                Key: { PK: pk, SK: sk }
            }));
            
            console.log(`[REPO][getStats] Result:`, Item ? "Found" : "Not Found");
            return Item || null;
        } catch (error) {
            console.error(`[REPO][getStats] ERROR:`, error.message);
            throw error;
        }
    },

    /**
     * 2. COMPARATIVA INTERANUAL (YoY)
     * yearsContext es un array de objetos { year, sk }
     */
    getStatsForYears: async (orgId, skList = []) => {
        const pk = formatPK(orgId);
        try {
            const promises = skList.map(sk => 
                ddb.send(new GetCommand({
                    TableName: TABLE,
                    Key: { PK: pk, SK: sk }
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
     * 3. GOBERNANZA Y AUDITORÍA (INV#)
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
            return null;
        }
    }
};