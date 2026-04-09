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
    // 1. Extraemos los campos del registro ya procesado por el Mapper
    const { 
        PK, 
        SK, 
        extracted_data, 
        analytics_dimensions, 
        climatiq_result,
        ai_analysis 
    } = record;

    const now = new Date();
    const isoNow = now.toISOString();

    // 2. EXTRACCIÓN GARANTIZADA DEL MONTO (SPEND)
    // El Mapper lo guarda en record.extracted_data.total_amount
    const nSpend = Number(extracted_data?.total_amount || 0);
    const nCo2e = Number(climatiq_result?.co2e || 0);

    // Log de diagnóstico para confirmar que el valor llega a la DB
    console.log(`💰 [DB_PERSIST]: SK=${SK} | Spend=${nSpend} | CO2=${nCo2e}`);

    // 3. Normalización Temporal (Usamos lo que el Mapper ya calculó en analytics_dimensions)
    const year = analytics_dimensions?.period_year || now.getFullYear();
    const monthVal = analytics_dimensions?.period_month || (now.getMonth() + 1);
    const monthStr = monthVal.toString().padStart(2, '0');
    const quarter = Math.floor((monthVal - 1) / 3) + 1;

    // 4. Identificadores de Soporte
    const service = (ai_analysis?.service_type || "UNKNOWN").toUpperCase();
    const scopeNum = getScopeByService(service);
    const vendorKeyIdentifier = SK.split('#')[1] || "UNKNOWN";

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
        {
            Put: {
                TableName: TABLE_NAME,
                Item: record, // Guardamos el Golden Record completo
                ConditionExpression: "attribute_not_exists(SK)"
            }
        },
        createStatsUpdate(`STATS#YEAR#${year}#QUARTER#${quarter}#MONTH#${monthStr}`, true),
        createStatsUpdate(`STATS#YEAR#${year}#QUARTER#${quarter}#TOTAL`),
        createStatsUpdate(`STATS#YEAR#${year}#TOTAL`),
        {
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: `SCOPE#YEAR#${year}#TYPE#${scopeNum}` },
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
        console.log(`✅ [DB_SYNC]: Transaction complete. SK: ${SK} | Total Spend Updated: ${nSpend}`);
        return { success: true };
    } catch (error) {
        if (error.name === "TransactionCanceledException") {
            console.warn("⚠️ [DB_DUP/CANCEL]: Factura ya procesada o conflicto de transacción.");
            return { success: false, reason: "CANCELLED" };
        }
        console.error("❌ [DB_FATAL]:", error);
        throw error;
    }
};

export default { persistTransaction };