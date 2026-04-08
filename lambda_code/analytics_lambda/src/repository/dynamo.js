/**
 * @fileoverview Repository Layer - Capa de acceso a datos para DynamoDB.
 * Implementa logs detallados para depuración de rutas y tipos de datos.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Configuración de Clientes
const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const ddb = DynamoDBDocumentClient.from(client);

const s3Client = new S3Client({ region: process.env.AWS_REGION || "eu-central-1" });
const BUCKET_NAME = process.env.ATTACHMENTS_BUCKET;
const TABLE = process.env.DYNAMO_TABLE;

const formatPK = (id) => id.startsWith('ORG#') ? id : `ORG#${id}`;

export const repo = {
    /**
     * 1. DASHBOARD PRINCIPAL: Obtiene totales anuales.
     */
    getStats: async (orgId, year) => {
        const pk = formatPK(orgId);
        const sk = `STATS#${year}`;
        try {
            const { Item } = await ddb.send(new GetCommand({
                TableName: TABLE,
                Key: { PK: pk, SK: sk }
            }));
            return Item || null;
        } catch (error) {
            console.error(`[REPO][getStats] ERROR:`, error.message);
            throw error;
        }
    },

    /**
     * 2. BUSCADOR POR VENDOR
     */
    getInvoicesByVendor: async (orgId, vendorPrefix) => {
        const pk = formatPK(orgId);
        const skPrefix = `INV#${vendorPrefix.toUpperCase()}`;
        try {
            const { Items } = await ddb.send(new QueryCommand({
                TableName: TABLE,
                KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
                ExpressionAttributeValues: { ":pk": pk, ":sk": skPrefix }
            }));
            return Items || [];
        } catch (error) {
            console.error(`[REPO][getByVendor] ERROR:`, error.message);
            throw error;
        }
    },

    /**
     * 3. MOTOR DE FILTROS AVANZADO (Corregido y Mapeado)
     */
    searchInvoices: async (orgId, filters) => {
        console.log("--- [REPO START] searchInvoices ---");
        const finalPK = formatPK(orgId);
        
        const params = {
            TableName: TABLE,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
            ExpressionAttributeValues: {
                ":pk": finalPK,
                ":skPrefix": "INV#" 
            }
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

        if (filterParts.length > 0) {
            params.FilterExpression = filterParts.join(" AND ");
        }

        try {
            const result = await ddb.send(new QueryCommand(params));
            const rawItems = result.Items || [];

            // MAPEADO DE DATOS Y GENERACIÓN DE PDF LINK
            const mappedItems = await Promise.all(rawItems.map(async (item) => {
                let signedUrl = null;

                // Validación de Bucket Name para evitar error "HTTP label: Bucket"
                if (BUCKET_NAME && item.metadata?.s3_key) {
                    try {
                        const command = new GetObjectCommand({
                            Bucket: BUCKET_NAME,
                            Key: item.metadata.s3_key,
                        });
                        signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
                    } catch (s3Err) {
                        console.error(`S3 Error para ${item.SK}:`, s3Err.message);
                    }
                }

                // Retornamos objeto plano (Sin .S, .M ni .N)
                return {
                    id: item.SK,
                    vendor: item.extracted_data?.vendor || "N/A",
                    invoiceDate: item.extracted_data?.invoice_date,
                    totalAmount: item.extracted_data?.total_amount,
                    emissions: item.climatiq_result?.co2e,
                    confidence: item.ai_analysis?.confidence_score,
                    requiresReview: item.ai_analysis?.requires_review || false,
                    pdfUrl: signedUrl 
                };
            }));

            console.log("--- [REPO END] searchInvoices ---");
            return mappedItems;

        } catch (error) {
            console.error("--- [REPO ERROR] ---", error.message);
            throw error;
        }
    },

    /**
     * 4. AUDITORÍA
     */
    getLowConfidenceInvoices: async (orgId, threshold = 0.9) => {
        const pk = formatPK(orgId);
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
            return Items || [];
        } catch (error) {
            console.error(`[REPO][Auditoría] ERROR:`, error.message);
            throw error;
        }
    }
};