/**
 * @fileoverview Repository Layer - Capa de acceso a datos para DynamoDB.
 * Implementa logs detallados para depuración de rutas y tipos de datos.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });

const s3Client = new S3Client({ region: process.env.AWS_REGION || "eu-central-1" });
const BUCKET_NAME = process.env.ATTACHMENTS_BUCKET;

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
     * 3. MOTOR DE FILTROS AVANZADO: Búsqueda flexible multivariable.
     * Ajustado a analytics_dimensions (Valores Numéricos).
     */

// ... dentro de tu objeto repo:

searchInvoices: async (orgId, filters) => {
    console.log("--- [DEBUG START] searchInvoices ---");
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
        console.log(`Resultado DynamoDB: ${result.Items?.length || 0} ítems.`);

        // --- MAPEO DE DATOS Y GENERACIÓN DE PDF LINK ---
        const mappedItems = await Promise.all((result.Items || []).map(async (item) => {
            let signedUrl = null;

            // Generamos el link si existe la key en metadata
            if (item.metadata?.s3_key) {
                try {
                    const command = new GetObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: item.metadata.s3_key,
                    });
                    // El link expira en 1 hora (3600 seg)
                    signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
                } catch (s3Err) {
                    console.error("Error generando URL firmada:", s3Err.message);
                }
            }

            // Retornamos el objeto aplanado para GraphQL
            return {
                id: item.SK,
                vendor: item.extracted_data?.vendor || "N/A",
                invoiceDate: item.extracted_data?.invoice_date,
                totalAmount: item.extracted_data?.total_amount,
                emissions: item.climatiq_result?.co2e,
                confidence: item.ai_analysis?.confidence_score,
                requiresReview: item.ai_analysis?.requires_review,
                pdfUrl: signedUrl // <--- Aquí está el link que faltaba
            };
        }));

        console.log("Muestra del primer ítem mapeado:", JSON.stringify(mappedItems[0], null, 2));
        console.log("--- [DEBUG END] searchInvoices ---");
        
        return mappedItems;

    } catch (error) {
        console.error("--- [DEBUG ERROR] ---", error.message);
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