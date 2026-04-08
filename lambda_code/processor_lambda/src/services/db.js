import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
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

/**
 * Determina el Scope según el tipo de servicio (Lógica de Negocio ESG)
 */
const getScopeByService = (service) => {
    const scopeMap = {
        'ELEC': 'scope_2',
        'GAS': 'scope_1',
        'FLEET': 'scope_1',
        'REFRIGERANTS': 'scope_1',
        'WATER': 'scope_3',
        'LOGISTICS': 'scope_3',
        'CLOUDOPS': 'scope_3',
        'WASTE_PAPER': 'scope_3',
        'WASTE_MIXED': 'scope_3'
    };
    return scopeMap[service] || 'scope_3';
};

export const persistTransaction = async (record) => {
    const { PK, analytics_dimensions, climatiq_result, extracted_data, ai_analysis } = record;
    
    const year = analytics_dimensions.period_year;
    const month = analytics_dimensions.period_month.toString().padStart(2, '0');
    const branchId = analytics_dimensions.branch_id; 
    const assetId = analytics_dimensions.asset_id;   
    const service = (ai_analysis.service_type || "UNKNOWN").toUpperCase();
    const scopeField = getScopeByService(service);
    
    const rawTaxId = extracted_data.VENDOR_TAX_ID || extracted_data.tax_id || extracted_data.cif;
    const vendorName = extracted_data.vendor || "UNKNOWN_VENDOR";
    const vendorKeyIdentifier = rawTaxId 
        ? rawTaxId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() 
        : `HASH_${generateFallbackId(vendorName)}`;

    // --- Definición de SKs (Nuevas Estructuras Incluidas) ---
    const statsSK = `STATS#${year}`;
    const branchSK = `BRANCH#${branchId}`;
    const assetSK = `ASSET#${assetId}#YEAR#${year}`;
    const vendorSK = `VENDOR#${vendorKeyIdentifier}`;
    const scopeSK = `SCOPE#YEAR#${year}`;
    const factorSK = `FACTOR#SERVICE#${service}#REGION#${extracted_data.location?.country || 'GLOBAL'}`;

    const nCo2e = Number(climatiq_result.co2e || 0);
    const nSpend = Number(extracted_data.total_amount || 0);
    const confidence = Number(ai_analysis.confidence_score || 0);
    const now = new Date().toISOString();

    const transactItems = [
        {
            Put: {
                TableName: TABLE_NAME,
                Item: record,
                ConditionExpression: "attribute_not_exists(SK)" 
            }
        },
        {
            // --- B. AGREGACIÓN GLOBAL + BUDGET TRACKING ---
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: statsSK },
                UpdateExpression: `
                    SET #mCo2e = if_not_exists(#mCo2e, :zero) + :nCo2e,
                        #mSpend = if_not_exists(#mSpend, :zero) + :nSpend,
                        #sCo2e = if_not_exists(#sCo2e, :zero) + :nCo2e,
                        total_co2e_kg = if_not_exists(total_co2e_kg, :zero) + :nCo2e,
                        total_spend = if_not_exists(total_spend, :zero) + :nSpend,
                        invoice_count = if_not_exists(invoice_count, :zero) + :one,
                        total_confidence_points = if_not_exists(total_confidence_points, :zero) + :conf,
                        last_updated = :now
                `,
                ExpressionAttributeNames: { 
                    "#mCo2e": `month_${month}_co2e`,
                    "#mSpend": `month_${month}_spend`,
                    "#sCo2e": `service_${service}_co2e`
                },
                ExpressionAttributeValues: { 
                    ":nCo2e": nCo2e, ":nSpend": nSpend, ":conf": confidence,
                    ":one": 1, ":zero": 0, ":now": now 
                }
            }
        },
        {
            // --- D. AGREGADO POR SCOPE (Compliance SEC/CSRD) ---
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: scopeSK },
                UpdateExpression: `
                    SET #scopeField = if_not_exists(#scopeField, :zero) + :nCo2e,
                        total_year_co2e = if_not_exists(total_year_co2e, :zero) + :nCo2e,
                        last_updated = :now
                `,
                ExpressionAttributeNames: { "#scopeField": scopeField },
                ExpressionAttributeValues: { ":nCo2e": nCo2e, ":zero": 0, ":now": now }
            }
        },
        {
            // --- E. HISTÓRICO DE FACTORES (Auditabilidad) ---
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: factorSK },
                UpdateExpression: `
                    SET last_factor_used = :factor,
                        source = :source,
                        unit = :unit,
                        last_applied = :now
                `,
                ExpressionAttributeValues: { 
                    ":factor": nCo2e / (Number(ai_analysis.value) || 1),
                    ":source": "Climatiq API",
                    ":unit": ai_analysis.unit || "kWh",
                    ":now": now 
                }
            }
        }
    ];

    // --- AGREGACIÓN POR SUCURSAL, ASSET Y VENDOR (Se mantienen igual) ---
    if (branchId) {
        transactItems.push({
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: branchSK },
                UpdateExpression: `SET total_co2e = if_not_exists(total_co2e, :zero) + :nCo2e, total_spend = if_not_exists(total_spend, :zero) + :nSpend, #mCo2e = if_not_exists(#mCo2e, :zero) + :nCo2e, last_updated = :now`,
                ExpressionAttributeNames: { "#mCo2e": `month_${month}_co2e` },
                ExpressionAttributeValues: { ":nCo2e": nCo2e, ":nSpend": nSpend, ":zero": 0, ":now": now }
            }
        });
    }

    if (assetId) {
        transactItems.push({
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: assetSK },
                UpdateExpression: `SET total_co2e = if_not_exists(total_co2e, :zero) + :nCo2e, #mCo2e = if_not_exists(#mCo2e, :zero) + :nCo2e, last_updated = :now`,
                ExpressionAttributeNames: { "#mCo2e": `month_${month}_co2e` },
                ExpressionAttributeValues: { ":nCo2e": nCo2e, ":zero": 0, ":now": now }
            }
        });
    }

    transactItems.push({
        Update: {
            TableName: TABLE_NAME,
            Key: { PK, SK: vendorSK },
            UpdateExpression: `SET total_co2e = if_not_exists(total_co2e, :zero) + :nCo2e, total_invoices = if_not_exists(total_invoices, :zero) + :one, vendor_name = :vName, tax_id_original = :tId, last_invoice_date = :now, service_type = :service`,
            ExpressionAttributeValues: { ":nCo2e": nCo2e, ":one": 1, ":zero": 0, ":vName": vendorName, ":tId": rawTaxId || "NOT_EXTRACTED", ":now": now, ":service": service }
        }
    });

    try {
        await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
        return { success: true };
    } catch (error) {
        if (error.name === "TransactionCanceledException") {
            if (error.CancellationReasons[0].Code === "ConditionalCheckFailed") {
                return { success: false, reason: "DUPLICATE" };
            }
        }
        throw error;
    }
};

// Al final de todo tu archivo db.js
export default { persistTransaction };