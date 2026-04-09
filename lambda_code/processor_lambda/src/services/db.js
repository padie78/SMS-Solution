import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
    DynamoDBDocumentClient, 
    TransactWriteCommand, 
    UpdateCommand 
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
    const scopeMap = {
        'ELEC': '1', 'GAS': '1', 'FLEET': '1', 'REFRIGERANTS': '1',
        'WATER': '3', 'LOGISTICS': '3', 'CLOUDOPS': '3'
    };
    return scopeMap[service.toUpperCase()] || '3';
};

/**
 * PERSISTENCIA ATÓMICA REFINADA
 */
export const persistTransaction = async (record) => {
    const { PK, analytics_dimensions, climatiq_result, extracted_data, ai_analysis } = record;

    // 1. Tiempo y Jerarquía
    const now = new Date();
    const year = analytics_dimensions?.period_year || now.getFullYear();
    const monthVal = analytics_dimensions?.period_month || (now.getMonth() + 1);
    const monthStr = monthVal.toString().padStart(2, '0');
    const quarter = Math.floor((monthVal - 1) / 3) + 1;

    const branchId = analytics_dimensions?.branch_id;
    const assetId = analytics_dimensions?.asset_id;
    const service = (ai_analysis?.service_type || "UNKNOWN").toUpperCase();
    const scopeNum = getScopeByService(service);

    // 2. Identificación de Proveedor (TaxID prioritario)
    const rawTaxId = extracted_data?.VENDOR_TAX_ID || extracted_data?.tax_id || extracted_data?.cif;
    const vendorName = extracted_data?.vendor || "UNKNOWN_VENDOR";
    const vendorKeyIdentifier = rawTaxId
        ? rawTaxId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
        : `HASH_${generateFallbackId(vendorName)}`;

    // 3. Definición de Sort Keys (SK) según requerimientos
    const statsSK = `STATS#YEAR#${year}#QUARTER#${quarter}#MONTH#${monthStr}`;
    const scopeSK = `SCOPE#YEAR#${year}#TYPE#${scopeNum}`;
    const budgetSK = `BUDGET#YEAR#${year}`;
    const factorSK = `FACTOR#SERVICE#${service}#REGION#${extracted_data?.location?.country || 'GLOBAL'}`;
    const branchSK = `BRANCH#${branchId}`;
    const assetSK = `ASSET#${assetId}#YEAR#${year}`;
    const vendorSK = `VENDOR#${vendorKeyIdentifier}`;

    // 4. Valores Numéricos
    const nCo2e = Number(climatiq_result?.co2e || 0);
    const nSpend = Number(extracted_data?.total_amount || 0);
    const confidence = Number(ai_analysis?.confidence_score || 0);
    const consumptionVal = Number(ai_analysis?.value || 0);
    const isoNow = now.toISOString();

    const safeFactor = (nCo2e > 0 && consumptionVal > 0) ? (nCo2e / consumptionVal) : 0;

    const transactItems = [
        {
            // A. Registro de Factura Original
            Put: {
                TableName: TABLE_NAME,
                Item: record,
                ConditionExpression: "attribute_not_exists(SK)"
            }
        },
        {
            // B. Estadísticas con Jerarquía (Año/Q/Mes)
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: statsSK },
                UpdateExpression: `
                    SET total_co2e = if_not_exists(total_co2e, :zero) + :nCo2e,
                        total_spend = if_not_exists(total_spend, :zero) + :nSpend,
                        invoice_count = if_not_exists(invoice_count, :zero) + :one,
                        avg_confidence = if_not_exists(avg_confidence, :zero) + :conf,
                        last_updated = :now,
                        year_ref = :year,
                        quarter_ref = :q,
                        month_ref = :m
                `,
                ExpressionAttributeValues: {
                    ":nCo2e": nCo2e, ":nSpend": nSpend, ":one": 1, ":conf": confidence,
                    ":zero": 0, ":now": isoNow, ":year": year, ":q": quarter, ":m": monthVal
                }
            }
        },
        {
            // C. Reporte por Scopes (Categorizado)
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: scopeSK },
                UpdateExpression: `
                    SET co2e_accumulated = if_not_exists(co2e_accumulated, :zero) + :nCo2e,
                        scope_type = :sNum,
                        last_updated = :now
                `,
                ExpressionAttributeValues: { ":nCo2e": nCo2e, ":sNum": scopeNum, ":zero": 0, ":now": isoNow }
            }
        },
        {
            // D. Presupuesto Anual
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: budgetSK },
                UpdateExpression: `
                    SET current_usage_kg = if_not_exists(current_usage_kg, :zero) + :nCo2e,
                        last_updated = :now
                `,
                ExpressionAttributeValues: { ":nCo2e": nCo2e, ":zero": 0, ":now": isoNow }
            }
        },
        {
            // E. Factor de Emisión Usado (Auditoría)
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: factorSK },
                UpdateExpression: `
                    SET last_factor_value = :factor,
                        service_type = :svc,
                        region = :reg,
                        last_applied = :now
                `,
                ExpressionAttributeValues: { 
                    ":factor": safeFactor, ":svc": service,
                    ":reg": extracted_data?.location?.country || 'GLOBAL', ":now": isoNow 
                }
            }
        }
    ];

    // F. Agregaciones Dinámicas (Branch, Asset, Vendor)
    if (branchId) {
        transactItems.push({
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: branchSK },
                UpdateExpression: "SET total_co2e = if_not_exists(total_co2e, :zero) + :nCo2e, last_updated = :now",
                ExpressionAttributeValues: { ":nCo2e": nCo2e, ":zero": 0, ":now": isoNow }
            }
        });
    }

    if (assetId) {
        transactItems.push({
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: assetSK },
                UpdateExpression: "SET total_co2e = if_not_exists(total_co2e, :zero) + :nCo2e, last_updated = :now",
                ExpressionAttributeValues: { ":nCo2e": nCo2e, ":zero": 0, ":now": isoNow }
            }
        });
    }

    // G. Maestro de Proveedores (Auto-discovery)
    transactItems.push({
        Update: {
            TableName: TABLE_NAME,
            Key: { PK, SK: vendorSK },
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
    });

    try {
        await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
        return { success: true };
    } catch (error) {
        console.error("❌ [PERSIST_ERROR]:", error);
        throw error;
    }
};

export default { persistTransaction };
