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
 * Mapeo de Scopes por tipo de servicio
 */
const getScopeByService = (service) => {
    const scopeMap = { 
        'ELEC': '2', 'GAS': '1', 'FLEET': '1', 
        'REFRIGERANTS': '1', 'WATER': '3', 
        'LOGISTICS': '3', 'CLOUDOPS': '3' 
    };
    return scopeMap[service.toUpperCase()] || '3';
};

/**
 * PERSIST TRANSACTION (Principal - Usada por el IA Pipeline)
 * Mantiene tu lógica de agregación de estadísticas intacta.
 */
export const persistTransaction = async (record) => {
    const { PK, SK, extracted_data, analytics_dimensions, climatiq_result, ai_analysis } = record;
    const now = new Date();
    const isoNow = now.toISOString();

    // 1. Extracción de valores numéricos (Gasto y Carbono)
    const nSpend = Number(extracted_data?.total_amount || 0);
    const nCo2e = Number(climatiq_result?.co2e || 0);
    
    // 2. Lógica de Estadísticas y Tiempos
    const year = analytics_dimensions?.period_year || now.getFullYear();
    const monthVal = analytics_dimensions?.period_month || (now.getMonth() + 1);
    const monthStr = monthVal.toString().padStart(2, '0');
    const quarter = Math.floor((monthVal - 1) / 3) + 1;

    // 3. Identificadores según nuevo esquema
    const service = (ai_analysis?.service_type || "UNKNOWN").toUpperCase();
    const taxId = String(extracted_data?.VENDOR_TAX_ID || "UNKNOWN").replace(/[^a-zA-Z0-9]/g, '');

    // Helper interno para las actualizaciones de Stats
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
                ":nCo2e": nCo2e, 
                ":nSpend": nSpend, 
                ":one": 1, 
                ":zero": 0, 
                ":now": isoNow,
                ...(includeMeta && { ":year": year, ":q": quarter, ":m": monthVal })
            }
        }
    });

    const transactItems = [
        // A. La Factura: INVOICE#${date}#${invId}
        {
            Put: {
                TableName: TABLE_NAME,
                Item: record,
                ConditionExpression: "attribute_not_exists(SK)"
            }
        },
        // B. Estadísticas (Agregación Mensual, Trimestral y Anual)
        createStatsUpdate(`STATS#YEAR#${year}#QUARTER#${quarter}#MONTH#${monthStr}`, true),
        createStatsUpdate(`STATS#YEAR#${year}#QUARTER#${quarter}#TOTAL`),
        createStatsUpdate(`STATS#YEAR#${year}#TOTAL`),
        
        // C. Registro del Vendor: VENDOR#${taxId}#INFO
        {
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: `VENDOR#${taxId}#INFO` },
                UpdateExpression: `
                    SET total_co2e_contribution = if_not_exists(total_co2e_contribution, :zero) + :nCo2e,
                        vendor_name = :vName,
                        tax_id = :tId,
                        last_active = :now
                `,
                ExpressionAttributeValues: {
                    ":nCo2e": nCo2e, 
                    ":vName": extracted_data?.vendor || "UNKNOWN", 
                    ":tId": taxId,
                    ":zero": 0, ":now": isoNow
                }
            }
        }
    ];

    try {
        await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
        console.log(`✅ [DB_SUCCESS]: Record & Stats updated. SK: ${SK} | Spend: ${nSpend}`);
        return { success: true };
    } catch (error) {
        if (error.name === "TransactionCanceledException") {
            console.warn("⚠️ [DB_DUP]: Factura duplicada o conflicto.");
            return { success: false, reason: "CANCELLED" };
        }
        throw error;
    }
};

/**
 * MÉTODOS COMPLEMENTARIOS (Entidades, Telemetría, Factores)
 */
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

// Exportación por defecto compatible con tu index.js actual
export default { 
    persistTransaction,
    saveEntity,
    saveTelemetry,
    saveEmissionFactor
};