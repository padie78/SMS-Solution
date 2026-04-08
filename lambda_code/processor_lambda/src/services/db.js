import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

// Configuración del cliente
const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const ddb = DynamoDBDocumentClient.from(client, {
    marshallOptions: { 
        removeUndefinedValues: true, 
        convertEmptyValues: true 
    }
});

const TABLE_NAME = "sms-platform-dev-emissions";

/**
 * Genera un ID corto y determinista para entidades sin identificador único claro
 */
const generateFallbackId = (text) => {
    return crypto.createHash('shake256', { outputLength: 4 })
        .update(text.toLowerCase().trim())
        .digest('hex');
};

/**
 * Mapeo de tipos de servicio a Scopes del GHG Protocol (Alcances 1, 2 y 3)
 */
const getScopeByService = (service) => {
    const scopeMap = {
        'ELEC': 'scope_2',         // Energía indirecta
        'GAS': 'scope_1',          // Combustión directa
        'FLEET': 'scope_1',        // Combustible vehículos propios
        'REFRIGERANTS': 'scope_1', // Fugas de gases
        'WATER': 'scope_3',        // Cadena de valor
        'LOGISTICS': 'scope_3',    // Transporte tercerizado
        'CLOUDOPS': 'scope_3',     // Emisiones de centros de datos (SaaS)
        'WASTE_PAPER': 'scope_3',
        'WASTE_MIXED': 'scope_3'
    };
    return scopeMap[service] || 'scope_3';
};

/**
 * Persiste una factura y actualiza todas las agregaciones atómicamente
 */
export const persistTransaction = async (record) => {
    const { PK, analytics_dimensions, climatiq_result, extracted_data, ai_analysis } = record;

    // 1. Normalización de Dimensiones Temporales y Organizativas
    const year = analytics_dimensions?.period_year || new Date().getFullYear();
    const month = (analytics_dimensions?.period_month || (new Date().getMonth() + 1)).toString().padStart(2, '0');
    const branchId = analytics_dimensions?.branch_id;
    const assetId = analytics_dimensions?.asset_id;
    const service = (ai_analysis?.service_type || "UNKNOWN").toUpperCase();
    const scopeField = getScopeByService(service);

    // 2. Identificación de Proveedor (Vendor)
    const rawTaxId = extracted_data?.VENDOR_TAX_ID || extracted_data?.tax_id || extracted_data?.cif;
    const vendorName = extracted_data?.vendor || "UNKNOWN_VENDOR";
    const vendorKeyIdentifier = rawTaxId
        ? rawTaxId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
        : `HASH_${generateFallbackId(vendorName)}`;

    // 3. Definición de Sort Keys (SK) para el diseño de Tabla Única
    const statsSK = `STATS#${year}`;
    const scopeSK = `SCOPE#YEAR#${year}`;
    const budgetSK = `BUDGET#YEAR#${year}`;
    const factorSK = `FACTOR#SERVICE#${service}#REGION#${extracted_data?.location?.country || 'GLOBAL'}`;
    const branchSK = `BRANCH#${branchId}`;
    const assetSK = `ASSET#${assetId}#YEAR#${year}`;
    const vendorSK = `VENDOR#${vendorKeyIdentifier}`;

    // 4. Sanitización de Valores Numéricos
    const nCo2e = Number(climatiq_result?.co2e || 0);
    const nSpend = Number(extracted_data?.total_amount || 0);
    const confidence = Number(ai_analysis?.confidence_score || 0);
    const consumptionVal = Number(ai_analysis?.value || 0);
    const now = new Date().toISOString();

    // Cálculo del factor aplicado (para auditoría)
    const safeFactor = (nCo2e > 0 && consumptionVal > 0) ? (nCo2e / consumptionVal) : 0;

    // 5. Construcción de la Transacción Atómica
    const transactItems = [
        {
            // A. Registro Individual de Factura (Evita duplicados por SK)
            Put: {
                TableName: TABLE_NAME,
                Item: record,
                ConditionExpression: "attribute_not_exists(SK)"
            }
        },
        {
            // B. Estadísticas Globales (Acumuladores por mes y servicio)
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
            // C. Reporte por Scopes (Cumplimiento ESG / GHG Protocol)
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
            // D. Gestión de Presupuesto e Inicialización de Configuración
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: budgetSK },
                UpdateExpression: `
                    SET current_usage_kg = if_not_exists(current_usage_kg, :zero) + :nCo2e,
                        annual_limit_kg = if_not_exists(annual_limit_kg, :zero),
                        is_configured = if_not_exists(is_configured, :false),
                        reduction_target_pct = if_not_exists(reduction_target_pct, :zero),
                        year_reference = :year,
                        last_updated = :now
                `,
                ExpressionAttributeValues: { 
                    ":nCo2e": nCo2e, 
                    ":zero": 0, 
                    ":false": false,
                    ":year": year,
                    ":now": now
                }
            }
        },
        {
            // E. Historial de Factores de Emisión (Auditoría Técnica)
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: factorSK },
                UpdateExpression: `
                    SET last_factor_used = :factor,
                        #src = :source,
                        #unt = :unit,
                        last_applied = :now
                `,
                ExpressionAttributeNames: { "#src": "source", "#unt": "unit" },
                ExpressionAttributeValues: { 
                    ":factor": safeFactor,
                    ":source": "Climatiq API",
                    ":unit": ai_analysis?.unit || "unit",
                    ":now": now 
                }
            }
        }
    ];

    // 6. Agregaciones por Sucursal, Activo y Vendedor (Opcionales)
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

    // Actualización de métricas por Vendedor
    transactItems.push({
        Update: {
            TableName: TABLE_NAME,
            Key: { PK, SK: vendorSK },
            UpdateExpression: `
                SET total_co2e = if_not_exists(total_co2e, :zero) + :nCo2e, 
                    total_invoices = if_not_exists(total_invoices, :zero) + :one, 
                    vendor_name = :vName, 
                    tax_id_original = :tId, 
                    last_invoice_date = :now, 
                    service_type = :service
            `,
            ExpressionAttributeValues: {
                ":nCo2e": nCo2e, ":one": 1, ":zero": 0,
                ":vName": vendorName, ":tId": rawTaxId || "NOT_EXTRACTED",
                ":now": now, ":service": service
            }
        }
    });

    // 7. Ejecución de la Transacción
    try {
        await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
        console.log(`✅ [DB_PERSIST]: Agregaciones completadas para ${record.SK}`);
        return { success: true };
    } catch (error) {
        if (error.name === "TransactionCanceledException") {
            const reasons = error.CancellationReasons;
            if (reasons[0]?.Code === "ConditionalCheckFailed") {
                console.warn(`⏭️ [SKIP]: Factura duplicada detectada.`);
                return { success: false, reason: "DUPLICATE" };
            }
            console.error("❌ [CANCELLED]:", JSON.stringify(reasons));
        }
        console.error("❌ [FATAL_DB_ERROR]:", error);
        throw error;
    }
};

export default { persistTransaction };