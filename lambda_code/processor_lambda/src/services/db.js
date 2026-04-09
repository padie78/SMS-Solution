import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
    DynamoDBDocumentClient, 
    TransactWriteCommand
} from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const ddb = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true, convertEmptyValues: true }
});

const TABLE_NAME = "sms-platform-dev-emissions";

const generateFallbackId = (text) => {
    return crypto.createHash('shake256', { outputLength: 4 })
        .update(text.toLowerCase().trim())
        .digest('hex');
};

const getScopeByService = (service) => {
    const scopeMap = { 'ELEC': '2', 'GAS': '1', 'FLEET': '1', 'REFRIGERANTS': '1', 'WATER': '3', 'LOGISTICS': '3', 'CLOUDOPS': '3' };
    return scopeMap[service.toUpperCase()] || '3';
};

/**
 * ADAPTACIÓN PARA EL NUEVO ESQUEMA DE BEDROCK
 */
export const persistTransaction = async (record) => {
    // 1. Extraemos según la nueva jerarquía del prompt
    const { 
        PK, 
        source_data, 
        analytics_metadata, 
        emission_lines, 
        climatiq_result, 
        technical_ids 
    } = record;

    const now = new Date();

    // 2. Normalización de Dimensiones Temporales (Evita los ceros en Dynamo)
    const year = analytics_metadata?.year || now.getFullYear();
    const monthVal = analytics_metadata?.month || (now.getMonth() + 1);
    const monthStr = monthVal.toString().padStart(2, '0');
    const quarter = analytics_metadata?.quarter 
        ? parseInt(analytics_metadata.quarter.replace('Q', '')) 
        : Math.floor((monthVal - 1) / 3) + 1;

    // 3. Normalización de Identidades (Vendor y Servicio)
    const service = (analytics_metadata?.category || "UNKNOWN").toUpperCase();
    const scopeNum = analytics_metadata?.scope || getScopeByService(service);
    
    const vendorName = source_data?.vendor?.name || "UNKNOWN_VENDOR";
    const rawTaxId = source_data?.vendor?.tax_id || technical_ids?.tax_id;
    const invoiceNum = source_data?.invoice_number || `NONUM-${Date.now()}`;
    
    const vendorKeyIdentifier = rawTaxId
        ? rawTaxId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
        : `HASH_${generateFallbackId(vendorName)}`;

    // 4. Definición de Sort Keys (SK)
    // El SK de la factura ahora es mucho más robusto para evitar UNKNOWNVENDOR
    const invoiceSK = `INV#${vendorKeyIdentifier}#${invoiceNum}`;
    const statsMonthSK   = `STATS#YEAR#${year}#QUARTER#${quarter}#MONTH#${monthStr}`;
    const statsQuarterSK = `STATS#YEAR#${year}#QUARTER#${quarter}#TOTAL`;
    const statsYearSK    = `STATS#YEAR#${year}#TOTAL`;
    const scopeSK = `SCOPE#YEAR#${year}#TYPE#${scopeNum}`;
    const budgetSK = `BUDGET#YEAR#${year}`;
    const factorSK = `FACTOR#SERVICE#${service}#REGION#${source_data?.location?.country || 'GLOBAL'}`;

    // 5. Valores Numéricos Sanitizados
    const nCo2e = Number(climatiq_result?.co2e || 0);
    const nSpend = Number(source_data?.total_amount?.total_with_tax || 0);
    // Sumamos todos los consumos de las líneas de emisión
    const consumptionVal = emission_lines?.reduce((acc, line) => acc + (Number(line.value) || 0), 0) || 0;
    const confidence = analytics_metadata?.confidence_level === 'HIGH' ? 0.95 : 0.7;
    const isoNow = now.toISOString();

    const safeFactor = (nCo2e > 0 && consumptionVal > 0) ? (nCo2e / consumptionVal) : 0;

    // Actualizamos el registro original con el SK correcto antes de guardarlo
    const finalRecord = { ...record, SK: invoiceSK };

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
                ":nCo2e": nCo2e, ":nSpend": nSpend, ":one": 1, 
                ":zero": 0, ":now": isoNow,
                ...(includeMeta && { ":year": year, ":q": quarter, ":m": monthVal })
            }
        }
    });

    const transactItems = [
        {
            Put: {
                TableName: TABLE_NAME,
                Item: finalRecord,
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
                Key: { PK, SK: factorSK },
                UpdateExpression: `
                    SET last_factor_value = :factor,
                        service_type = :svc,
                        #regAlias = :reg,
                        last_applied = :now
                `,
                ExpressionAttributeNames: { "#regAlias": "region" },
                ExpressionAttributeValues: { 
                    ":factor": safeFactor, ":svc": service,
                    ":reg": source_data?.location?.country || 'GLOBAL', ":now": isoNow 
                }
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
                    ":nCo2e": nCo2e, ":vName": vendorName, ":tId": rawTaxId || "N/A",
                    ":zero": 0, ":now": isoNow
                }
            }
        }
    ];

    try {
        await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
        console.log(`✅ [DB_SYNC]: Transaction complete. SK: ${invoiceSK}`);
        return { success: true };
    } catch (error) {
        if (error.name === "TransactionCanceledException") {
            console.warn("⚠️ [DB_DUP/CANCEL]:", error.CancellationReasons.map(r => r.Code));
            return { success: false, reason: "CANCELLED" };
        }
        throw error;
    }
};