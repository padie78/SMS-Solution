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

export const persistTransaction = async (record) => {
    const { PK, SK, extracted_data, analytics_dimensions, climatiq_result, ai_analysis, analytics_dimensions: dims } = record;
    const now = new Date();
    const isoNow = now.toISOString();

    const nSpend = Number(extracted_data?.total_amount || 0);
    const nCo2e = Number(climatiq_result?.co2e || 0);
    
    const year = analytics_dimensions?.period_year || now.getFullYear();
    const monthVal = analytics_dimensions?.period_month || (now.getMonth() + 1);
    const monthStr = monthVal.toString().padStart(2, '0');
    const quarter = Math.floor((monthVal - 1) / 3) + 1;

    const taxId = String(extracted_data?.VENDOR_TAX_ID || "UNKNOWN").replace(/[^a-zA-Z0-9]/g, '');
    const branchId = record.analytics_dimensions?.branch_id || "MAIN";
    const assetId = record.analytics_dimensions?.asset_id || "GENERIC_ASSET";

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
        // 1. INVOICE
        { Put: { TableName: TABLE_NAME, Item: record, ConditionExpression: "attribute_not_exists(SK)" } },
        
        // 2. STATS (Tu lógica original)
        createStatsUpdate(`STATS#YEAR#${year}#QUARTER#${quarter}#MONTH#${monthStr}`, true),
        createStatsUpdate(`STATS#YEAR#${year}#QUARTER#${quarter}#TOTAL`),
        createStatsUpdate(`STATS#YEAR#${year}#TOTAL`),
        
        // 3. VENDOR#TAXID#INFO
        {
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: `VENDOR#${taxId}#INFO` },
                UpdateExpression: `SET total_co2e_contribution = if_not_exists(total_co2e_contribution, :zero) + :nCo2e, vendor_name = :vName, last_active = :now`,
                ExpressionAttributeValues: { ":nCo2e": nCo2e, ":vName": extracted_data?.vendor || "UNKNOWN", ":zero": 0, ":now": isoNow }
            }
        },

        // 4. BRANCH#ID#INFO (Auto-creación/update al procesar factura)
        {
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: `BRANCH#${branchId}#INFO` },
                UpdateExpression: "SET last_invoice_date = :now, branch_status = :active",
                ExpressionAttributeValues: { ":now": isoNow, ":active": "ACTIVE" }
            }
        },

        // 5. ASSET#ID#INFO (Auto-creación/update al procesar factura)
        {
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: `ASSET#${assetId}#INFO` },
                UpdateExpression: "SET last_reading = :now, service_type = :svc",
                ExpressionAttributeValues: { ":now": isoNow, ":svc": ai_analysis?.service_type || "UNKNOWN" }
            }
        }
    ];

    try {
        await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
        console.log(`✅ [DB_SYNC]: Transaction complete. Invoice, Stats, Vendor, Branch and Asset updated.`);
        return { success: true };
    } catch (error) {
        if (error.name === "TransactionCanceledException") return { success: false, reason: "CANCELLED" };
        throw error;
    }
};

// MÉTODOS PARA CREACIÓN MANUAL (Desde la API de administración)
export const saveEntity = async (orgId, type, id, data) => {
    const skMap = {
        'METADATA': `METADATA#INFO`,
        'USER': `USER#${id}#PROFILE`,
        'BRANCH': `BRANCH#${id}#INFO`,
        'ASSET': `ASSET#${id}#INFO`,
        'GOAL': `GOAL#${id}`,
        'BUDGET': `BUDGET#YEAR#${id}`
    };
    return ddb.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: { PK: `ORG#${orgId}`, SK: skMap[type.toUpperCase()], ...data, updatedAt: new Date().toISOString() }
    }));
};

export const saveTelemetry = async (orgId, assetId, type, data) => {
    const skMap = {
        'HEALTH': `ASSET#${assetId}#HEALTH`,
        'BASELINE': `ASSET#${assetId}#BASELINE`,
        'SENSOR': `SENSOR#${assetId}#DATA`
    };
    return ddb.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: { PK: `ORG#${orgId}`, SK: skMap[type.toUpperCase()], ...data, timestamp: new Date().toISOString() }
    }));
};

export const saveEmissionFactor = async (year, orgId = 'GLOBAL', data) => {
    const pk = orgId === 'GLOBAL' ? 'GLOBAL' : `ORG#${orgId}`;
    return ddb.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: { PK: pk, SK: `EMISSION_FACTOR#YEAR#${year}#CUSTOM`, ...data }
    }));
};

export default { persistTransaction, saveEntity, saveTelemetry, saveEmissionFactor };