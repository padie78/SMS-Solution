import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
    DynamoDBDocumentClient, 
    TransactWriteCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const ddb = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true, convertEmptyValues: true }
});

const TABLE_NAME = "sms-platform-dev-emissions";

const getScopeByService = (service) => {
    const scopeMap = { 'ELEC': '2', 'GAS': '1', 'FLEET': '1', 'REFRIGERANTS': '1', 'WATER': '3', 'LOGISTICS': '3', 'CLOUDOPS': '3' };
    return scopeMap[service.toUpperCase()] || '3';
};

export const persistTransaction = async (record) => {
    const { PK, SK } = record;
    
    // Extraemos datos del objeto record (ya mapeado)
    const { 
        analytics_metadata, 
        climatiq_result, 
        extracted_data, // <--- Usamos esto para el Spend
        technical_ids 
    } = record;

    const now = new Date();

    // 1. CORRECCIÓN CRÍTICA: Extracción del Spend
    // Buscamos en el dato mapeado primero, luego en el original como fallback
    const nSpend = Number(
        extracted_data?.total_amount || 
        record.source_data?.total_amount?.total_with_tax || 
        0
    );

    console.log(`💰 [DB_STATS_DEBUG]: SK=${SK} | Spend detectado=${nSpend} | CO2=${climatiq_result?.co2e}`);

    // 2. Normalización de Dimensiones Temporales
    const year = analytics_metadata?.year || now.getFullYear();
    const monthVal = analytics_metadata?.month || (now.getMonth() + 1);
    const monthStr = monthVal.toString().padStart(2, '0');
    const quarter = analytics_metadata?.quarter 
        ? parseInt(analytics_metadata.quarter.replace('Q', '')) 
        : Math.floor((monthVal - 1) / 3) + 1;

    // 3. Identificadores para registros de soporte
    const service = (analytics_metadata?.service_type || "UNKNOWN").toUpperCase();
    const scopeNum = analytics_metadata?.scope || getScopeByService(service);
    const vendorKeyIdentifier = SK.split('#')[1] || "UNKNOWN";

    const statsMonthSK   = `STATS#YEAR#${year}#QUARTER#${quarter}#MONTH#${monthStr}`;
    const statsQuarterSK = `STATS#YEAR#${year}#QUARTER#${quarter}#TOTAL`;
    const statsYearSK    = `STATS#YEAR#${year}#TOTAL`;
    const scopeSK = `SCOPE#YEAR#${year}#TYPE#${scopeNum}`;
    const factorSK = `FACTOR#SERVICE#${service}#REGION#${extracted_data?.location?.country || 'GLOBAL'}`;

    // 4. Valores Numéricos Sanitizados
    const nCo2e = Number(climatiq_result?.co2e || 0);
    const consumptionVal = Number(record.ai_analysis?.value || 0);
    const isoNow = now.toISOString();
    const safeFactor = (nCo2e > 0 && consumptionVal > 0) ? (nCo2e / consumptionVal) : 0;

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
                ":nSpend": nSpend, // <--- Ahora pasará el valor real
                ":one": 1, 
                ":zero": 0, 
                ":now": isoNow,
                ...(includeMeta && { ":year": year, ":q": quarter, ":m": monthVal })
            }
        }
    });

    const transactItems = [
        {
            Put: {
                TableName: TABLE_NAME,
                Item: record,
                ConditionExpression: "attribute_not_exists(SK)"
            }
        },
        createStatsUpdate(statsMonthSK, true),
        createStatsUpdate(statsQuarterSK),
        createStatsUpdate(statsYearSK),
        {
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: scopeSK },
                UpdateExpression: `
                    SET co2e_accumulated = if_not_exists(co2e_accumulated, :zero) + :nCo2e,
                        scope_type = :sNum,
                        last_updated = :now
                `,
                ExpressionAttributeValues: { ":nCo2e": nCo2e, ":sNum": String(scopeNum), ":zero": 0, ":now": isoNow }
            }
        },
        {
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: `VENDOR#${vendorKeyIdentifier}` },
                UpdateExpression: `
                    SET total_co2e_contribution = if_not_exists(total_co2e_contribution, :zero) + :nCo2e,
                        vendor_name = :vName,
                        tax_id = :tId,
                        last_active = :now
                `,
                ExpressionAttributeValues: {
                    ":nCo2e": nCo2e, 
                    ":vName": extracted_data?.vendor || "UNKNOWN", 
                    ":tId": extracted_data?.VENDOR_TAX_ID || "N/A",
                    ":zero": 0, ":now": isoNow
                }
            }
        }
    ];

    try {
        await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
        console.log(`✅ [DB_SYNC]: Transaction complete. SK: ${SK} | Spend: ${nSpend}`);
        return { success: true };
    } catch (error) {
        if (error.name === "TransactionCanceledException") {
            console.warn("⚠️ [DB_DUP/CANCEL]:", error.CancellationReasons.map(r => r.Code));
            return { success: false, reason: "CANCELLED" };
        }
        throw error;
    }
};

export default { persistTransaction };