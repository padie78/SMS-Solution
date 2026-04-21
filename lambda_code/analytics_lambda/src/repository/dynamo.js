/**
 * @fileoverview Repository Layer - Capa de acceso a datos para DynamoDB.
 * Adaptado para Single Table Design con SKs de tipo STATS#... e INV#...
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const ddb = DynamoDBDocumentClient.from(client);
const s3Client = new S3Client({ region: process.env.AWS_REGION || "eu-central-1" });

const BUCKET_NAME = process.env.BUCKET_NAME || "sms-platform-dev-uploads";
const TABLE = process.env.TABLE_NAME || "sms-platform-dev-emissions";

const formatPK = (id) => id.startsWith('ORG#') ? id : `ORG#${id}`;

/**
 * Genera una URL firmada para previsualizar el PDF de la factura.
 */
const generateSignedUrl = async (s3Key) => {
    if (!s3Key) return null;
    try {
        const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key });
        return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } catch (err) {
        console.error(`[S3_ERROR]: No se pudo generar URL para ${s3Key}:`, err.message);
        return null;
    }
};

export const repo = {
    /**
     * 1. STATS (Estratégico & KPIs)
     * Obtiene un registro puntual de métricas (Año, Mes, Trimestre, Semana o Día).
     */
    getStats: async (orgId, sk) => {
        const pk = formatPK(orgId);
        console.log(`[REPO][getStats] Leyendo PK: ${pk}, SK: ${sk}`);

        try {
            const { Item } = await ddb.send(new GetCommand({
                TableName: TABLE,
                Key: { PK: pk, SK: sk }
            }));

            return Item || null;
        } catch (error) {
            console.error(`[REPO][getStats] ERROR en GetItem:`, error.message);
            throw error;
        }
    },

    getOrgConfig: async (orgId) => {
        const pk = formatPK(orgId);
        // Cambiamos el SK a METADATA según tu estructura actual
        const sk = "METADATA"; 
        
        console.log(`[REPO][getOrgConfig] Leyendo Metadatos desde: ${pk}#${sk}`);

        try {
            const { Item } = await ddb.send(new GetCommand({
                TableName: TABLE,
                Key: {
                    PK: pk,
                    SK: sk
                }
            }));

            // Si el ítem existe, lo devolvemos. Si no, fallback de seguridad.
            return Item || {
                totalGlobalM2: 1,
                currency: "USD",
                reductionTargetTon: 100,
                baselineMonthlySpend: 1000
            };
        } catch (error) {
            console.error(`[REPO][getOrgConfig] ERROR:`, error.message);
            return {
                totalGlobalM2: 1,
                currency: "USD",
                reductionTargetTon: 100,
                baselineMonthlySpend: 1000
            };
        }
    },

    /**
     * 2. GOBERNANZA Y AUDITORÍA (INV#)
     * Busca facturas por año/mes con resolución de URL de S3.
     */
    getInvoicesForAudit: async (orgId, filters = {}) => {
        const pk = formatPK(orgId);
        const params = {
            TableName: TABLE,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: {
                ":pk": pk,
                ":sk": "INV#"
            }
        };

        let filterParts = [];

        // Filtro por Año
        if (filters.year) {
            filterParts.push("analytics_dimensions.period_year = :y");
            params.ExpressionAttributeValues[":y"] = Number(filters.year);
        }

        // Filtro por Mes
        if (filters.month) {
            filterParts.push("analytics_dimensions.period_month = :m");
            params.ExpressionAttributeValues[":m"] = Number(filters.month);
        }

        // Filtro por Revisión (AI flag)
        if (filters.onlyRequiresReview) {
            filterParts.push("ai_analysis.requires_review = :r");
            params.ExpressionAttributeValues[":r"] = true;
        }

        if (filterParts.length > 0) {
            params.FilterExpression = filterParts.join(" AND ");
        }

        try {
            const { Items } = await ddb.send(new QueryCommand(params));

            // Inyectamos la URL firmada de S3 para cada factura encontrada
            return await Promise.all((Items || []).map(async (item) => ({
                ...item,
                pdfUrl: await generateSignedUrl(item.metadata?.s3_key)
            })));
        } catch (error) {
            console.error(`[REPO][getInvoicesForAudit] ERROR en Query:`, error.message);
            throw error;
        }
    },

    /**
     * 3. EXTRACCIÓN RAW (Para Ranking de Proveedores)
     * Obtiene todas las facturas de un año para procesar en memoria el ranking.
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
     * 4. CONFIGURACIÓN DE METAS
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
            console.warn(`[REPO][getGoals] No se encontraron metas para ${year}`);
            return null;
        }
    }
};