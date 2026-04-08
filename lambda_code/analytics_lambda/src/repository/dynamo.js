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
    /**
     * 3. MOTOR DE FILTROS AVANZADO: Búsqueda flexible multivariable.
     * Ajustado a analytics_dimensions (Valores Numéricos).
     */
    searchInvoices: async (orgId, filters) => {
        console.log("--- [DEBUG START] searchInvoices ---");
        const finalPK = formatPK(orgId);
        
        console.log(`Identidad: ${finalPK}`);
        console.log(`Filtros de entrada:`, JSON.stringify(filters));

        const params = {
            TableName: TABLE,
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
            ExpressionAttributeValues: {
                ":pk": finalPK,
                ":skPrefix": "INV#" 
            }
        };

        let filterParts = [];
        
        // 1. Filtro por Service (ELEC/GAS) - String en ai_analysis
        if (filters.service) {
            console.log(`Filtrando por Servicio: ${filters.service}`);
            filterParts.push("ai_analysis.service_type = :service");
            params.ExpressionAttributeValues[":service"] = filters.service.toUpperCase();
        }

        // 2. Filtro por Año - AHORA EN analytics_dimensions.period_year (NUMBER)
        if (filters.year) {
            console.log(`Filtrando por Año: ${filters.year} (Convirtiendo a Number)`);
            filterParts.push("analytics_dimensions.period_year = :year");
            params.ExpressionAttributeValues[":year"] = Number(filters.year);
        }

        // 3. Filtro por Mes - EN analytics_dimensions.period_month (NUMBER)
        if (filters.month) {
            console.log(`Filtrando por Mes: ${filters.month} (Convirtiendo a Number)`);
            filterParts.push("analytics_dimensions.period_month = :month");
            params.ExpressionAttributeValues[":month"] = Number(filters.month);
        }

        if (filterParts.length > 0) {
            params.FilterExpression = filterParts.join(" AND ");
        }

        console.log("JSON final enviado a DynamoDB SDK:", JSON.stringify(params, null, 2));

        try {
            const { Items } = await ddb.send(new QueryCommand(params));

            // Mapeo con generación de Links de S3
            const mappedItems = await Promise.all((Items || []).map(async (item) => {
                let downloadUrl = null;
                
                // Si existe el key en S3, generamos un link válido por 1 hora
                if (item.metadata?.s3_key) {
                    const command = new GetObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: item.metadata.s3_key,
                    });
                    downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
                }

                return {
                    vendor: item.extracted_data?.vendor || "Desconocido",
                    invoiceDate: item.extracted_data?.invoice_date,
                    totalAmount: item.extracted_data?.total_amount,
                    emissions: item.climatiq_result?.co2e,
                    confidence: item.ai_analysis?.confidence_score,
                    requiresReview: item.ai_analysis?.requires_review,
                    pdfUrl: downloadUrl, // <--- Este es el link para la grilla
                    id: item.SK
                };
            }));

            return mappedItems;
        } catch (error) {
            console.error("Error en searchInvoices:", error);
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