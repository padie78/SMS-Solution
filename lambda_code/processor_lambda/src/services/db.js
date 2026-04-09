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

/**
 * Genera un ID corto para entidades sin identificador claro
 */
const generateFallbackId = (text) => {
    return crypto.createHash('shake256', { outputLength: 4 })
        .update(text.toLowerCase().trim())
        .digest('hex');
};

/**
 * Mapeo de Scopes según GHG Protocol
 */
const getScopeByService = (service) => {
    const scopeMap = {
        'ELEC': '2',          // Alcance 2: Energía
        'GAS': '1',           // Alcance 1: Combustión
        'FLEET': '1',         // Alcance 1: Movilidad propia
        'REFRIGERANTS': '1',  // Alcance 1: Fugas
        'WATER': '3',         // Alcance 3: Cadena de valor
        'LOGISTICS': '3',     // Alcance 3: Transporte externo
        'CLOUDOPS': '3'       // Alcance 3: SaaS / Data Centers
    };
    return scopeMap[service.toUpperCase()] || '3';
};

/**
 * PERSISTENCIA ATÓMICA CON TRIPLE AGREGACIÓN TEMPORAL
 * Guarda: Factura + Totales Mensuales + Totales Cuatrimestrales + Totales Anuales
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

    // 2. Definición de Sort Keys (SK) - Estrategia de Reportabilidad Instantánea
    const statsMonthSK   = `STATS#YEAR#${year}#QUARTER#${quarter}#MONTH#${monthStr}`;
    const statsQuarterSK = `STATS#YEAR#${year}#QUARTER#${quarter}#TOTAL`;
    const statsYearSK    = `STATS#YEAR#${year}#TOTAL`;
    
    const scopeSK = `SCOPE#YEAR#${year}#TYPE#${scopeNum}`;
    const budgetSK = `BUDGET#YEAR#${year}`;
    const factorSK = `FACTOR#SERVICE#${service}#REGION#${extracted_data?.location?.country || 'GLOBAL'}`;
    const branchSK = `BRANCH#${branchId}`;
    const assetSK = `ASSET#${assetId}#YEAR#${year}`;
    
    const rawTaxId = extracted_data?.VENDOR_TAX_ID || extracted_data?.tax_id || extracted_data?.cif;
    const vendorName = extracted_data?.vendor || "UNKNOWN_VENDOR";
    const vendorKeyIdentifier = rawTaxId
        ? rawTaxId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
        : `HASH_${generateFallbackId(vendorName)}`;
    const vendorSK = `VENDOR#${vendorKeyIdentifier}`;

    // 3. Valores Numéricos Sanitizados
    const nCo2e = Number(climatiq_result?.co2e || 0);
    const nSpend = Number(extracted_data?.total_amount || 0);
    const confidence = Number(ai_analysis?.confidence_score || 0);
    const consumptionVal = Number(ai_analysis?.value || 0);
    const isoNow = now.toISOString();

    const safeFactor = (nCo2e > 0 && consumptionVal > 0) ? (nCo2e / consumptionVal) : 0;

    // 4. Helper para crear ítems de actualización de estadísticas (DRY)
    const createStatsUpdate = (sk, includeMeta = false) => ({
        Update: {
            TableName: TABLE_NAME,
            Key: { PK, SK: sk },
            UpdateExpression: `
                SET total_co2e = if_not_exists(total_co2e, :zero) + :nCo2e,
                    total_spend = if_not_exists(total_spend, :zero) + :nSpend,
                    invoice_count = if_not_exists(invoice_count, :zero) + :one,
                    avg_confidence = if_not_exists(avg_confidence, :zero) + :conf,
                    last_updated = :now
                    ${includeMeta ? ', year_ref = :year, quarter_ref = :q, month_ref = :m' : ''}
            `,
            ExpressionAttributeValues: {
                ":nCo2e": nCo2e, ":nSpend": nSpend, ":one": 1, ":conf": confidence,
                ":zero": 0, ":now": isoNow,
                ...(includeMeta && { ":year": year, ":q": quarter, ":m": monthVal })
            }
        }
    });

    // 5. Construcción de la Transacción
    const transactItems = [
        {
            // A. Registro de Factura Original (Evita duplicados por SK)
            Put: {
                TableName: TABLE_NAME,
                Item: record,
                ConditionExpression: "attribute_not_exists(SK)"
            }
        },
        // B. Triple Nivel de Agregación Temporal
        createStatsUpdate(statsMonthSK, true), // Detalle Mensual
        createStatsUpdate(statsQuarterSK),     // Agregado por Cuatrimestre
        createStatsUpdate(statsYearSK),        // Agregado Anual (KPI Principal)
        {
            // C. Reporte por Scopes
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
            // D. Consumo contra Presupuesto (Budget)
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
            // E. Auditoría de Factores de Emisión
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
                    ":reg": extracted_data?.location?.country || 'GLOBAL', ":now": isoNow 
                }
            }
        }
    ];

    // 6. Agregaciones por Entidad (Branch, Asset, Vendor)
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
        console.log(`✅ [DB_SYNC]: Transaction complete for Year: ${year}, Q: ${quarter}, Month: ${monthStr}`);
        return { success: true };
    } catch (error) {
        if (error.name === "TransactionCanceledException") {
            if (error.CancellationReasons[0]?.Code === "ConditionalCheckFailed") {
                console.warn("⚠️ [DB_DUP]: Invoice already exists. Skipping.");
                return { success: false, reason: "DUPLICATE" };
            }
        }
        console.error("❌ [PERSIST_ERROR]:", error);
        throw error;
    }
};

export default { persistTransaction };