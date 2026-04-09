import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
    DynamoDBDocumentClient, 
    TransactWriteCommand,
    PutCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const ddb = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true, convertEmptyValues: true }
});

const TABLE_NAME = "sms-platform-dev-emissions";

/**
 * Servicio de Base de Datos - Single Table Design
 */
export const db = {

    // --- 1. PROCESAMIENTO DE FACTURAS (IA PIPELINE) ---
    // Mantiene tu lógica original de estadísticas (Mes, Q, Año)
    persistInvoice: async (record) => {
        const { PK, SK, extracted_data, analytics_dimensions, climatiq_result, ai_analysis } = record;
        const now = new Date();
        const isoNow = now.toISOString();

        const nSpend = Number(extracted_data?.total_amount || 0);
        const nCo2e = Number(climatiq_result?.co2e || 0);
        
        const year = analytics_dimensions?.period_year || now.getFullYear();
        const monthVal = analytics_dimensions?.period_month || (now.getMonth() + 1);
        const monthStr = monthVal.toString().padStart(2, '0');
        const quarter = Math.floor((monthVal - 1) / 3) + 1;
        const taxId = String(extracted_data?.VENDOR_TAX_ID || "UNKNOWN").replace(/[^a-zA-Z0-9]/g, '');

        const createStatsUpdate = (sk, includeMeta = false) => ({
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: sk },
                UpdateExpression: `
                    SET total_co2e = if_not_exists(total_co2e, :zero) + :nCo2e,
                        total_spend = if_not_exists(total_spend, :zero) + :nSpend,
                        invoice_count = if_not_exists(invoice_count, :zero) + :one,
                        last_updated = :now
                        ${includeMeta ? ', year_ref = :year, quarter_ref = :q, month_ref = :m' : ''}
                `,
                ExpressionAttributeValues: {
                    ":nCo2e": nCo2e, ":nSpend": nSpend, ":one": 1, ":zero": 0, ":now": isoNow,
                    ...(includeMeta && { ":year": year, ":q": quarter, ":m": monthVal })
                }
            }
        });

        const transactItems = [
            // Factura: INVOICE#${date}#${invId}
            { Put: { TableName: TABLE_NAME, Item: record, ConditionExpression: "attribute_not_exists(SK)" } },
            // Estadísticas (Tu lógica original)
            createStatsUpdate(`STATS#YEAR#${year}#QUARTER#${quarter}#MONTH#${monthStr}`, true),
            createStatsUpdate(`STATS#YEAR#${year}#QUARTER#${quarter}#TOTAL`),
            createStatsUpdate(`STATS#YEAR#${year}#TOTAL`),
            // Proveedor: VENDOR#${taxId}#INFO
            {
                Update: {
                    TableName: TABLE_NAME,
                    Key: { PK, SK: `VENDOR#${taxId}#INFO` },
                    UpdateExpression: `SET total_co2e_contribution = if_not_exists(total_co2e_contribution, :zero) + :nCo2e, vendor_name = :vName, tax_id = :tId, last_active = :now`,
                    ExpressionAttributeValues: { ":nCo2e": nCo2e, ":vName": extracted_data?.vendor || "UNKNOWN", ":tId": taxId, ":zero": 0, ":now": isoNow }
                }
            }
        ];

        return ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
    },

    // --- 2. ENTIDADES MANUALES (ADMIN/USER) ---
    // Metadata, User, Branch, Asset Info, Goals, Budget
    saveEntity: async (orgId, type, id, data) => {
        const pk = `ORG#${orgId}`;
        const skMap = {
            'METADATA': `METADATA#INFO`,
            'USER': `USER#${id}#PROFILE`,
            'BRANCH': `BRANCH#${id}#INFO`,
            'ASSET': `ASSET#${id}#INFO`,
            'GOAL': `GOAL#${id}`,
            'BUDGET': `BUDGET#YEAR#${id}` // id es el año
        };

        return ddb.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: { PK: pk, SK: skMap[type.toUpperCase()], ...data, updatedAt: new Date().toISOString() }
        }));
    },

    // --- 3. DATOS DE SISTEMA E IOT ---
    // Asset Health, Baseline, Sensor Data
    saveSystemData: async (orgId, assetId, type, data) => {
        const pk = `ORG#${orgId}`;
        const skMap = {
            'HEALTH': `ASSET#${assetId}#HEALTH`,
            'BASELINE': `ASSET#${assetId}#BASELINE`,
            'SENSOR': `SENSOR#${assetId}#DATA` // aquí id sería el sensorId
        };

        return ddb.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: { PK: pk, SK: skMap[type.toUpperCase()], ...data, timestamp: new Date().toISOString() }
        }));
    },

    // --- 4. FACTORES DE EMISIÓN ---
    saveEmissionFactor: async (year, orgId = 'GLOBAL', data) => {
        const pk = orgId === 'GLOBAL' ? 'GLOBAL' : `ORG#${orgId}`;
        return ddb.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: { PK: pk, SK: `EMISSION_FACTOR#YEAR#${year}#CUSTOM`, ...data }
        }));
    }
};

export default { persistTransaction };