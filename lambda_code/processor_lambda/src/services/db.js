import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

// Inicialización del cliente de DynamoDB
const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" });
const ddb = DynamoDBDocumentClient.from(client, { 
    marshallOptions: { removeUndefinedValues: true, convertEmptyValues: true } 
});

const TABLE_NAME = "sms-platform-dev-emissions";

/**
 * Persistencia Atómica: Write-time Aggregation para SMS Platform.
 * Actualiza: Factura, Stats Globales, Sucursal, Activo y Proveedor.
 */
export const persistTransaction = async (record) => {
    const { 
        PK, 
        analytics_dimensions, 
        climatiq_result, 
        extracted_data, 
        ai_analysis, 
        metadata 
    } = record;
    
    // 1. Setup de Dimensiones Temporales y de Negocio
    const year = analytics_dimensions.period_year;
    const month = analytics_dimensions.period_month.toString().padStart(2, '0');
    const branchId = analytics_dimensions.branch_id; 
    const assetId = analytics_dimensions.asset_id;   
    const vendorName = extracted_data.vendor_name || "UNKNOWN_VENDOR";
    const service = (ai_analysis.service_type || "UNKNOWN").toUpperCase();

    // 2. Normalización de SKs para consistencia en la Single Table
    const statsSK = `STATS#${year}`;
    const branchSK = `BRANCH#${branchId}`;
    const assetSK = `ASSET#${assetId}#YEAR#${year}`;
    const vendorSK = `VENDOR#${vendorName.replace(/\s+/g, '_').toUpperCase()}`;

    // 3. Normalización de Valores Numéricos
    const nCo2e = Number(climatiq_result.co2e || 0);
    const nSpend = Number(extracted_data.total_amount || 0);
    const confidence = Number(ai_analysis.confidence_score || 0);
    const now = new Date().toISOString();

    // 4. Construcción de la Transacción Atómica
    const transactItems = [
        {
            // --- A. REGISTRO DE FACTURA (Idempotencia) ---
            Put: {
                TableName: TABLE_NAME,
                Item: record,
                ConditionExpression: "attribute_not_exists(SK)" 
            }
        },
        {
            // --- B. ESTADÍSTICAS GLOBALES (Resumen para Dashboard) ---
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
                    ":nCo2e": nCo2e, 
                    ":nSpend": nSpend, 
                    ":conf": confidence,
                    ":one": 1, 
                    ":zero": 0, 
                    ":now": now 
                }
            }
        }
    ];

    // --- C. ACTUALIZACIÓN DE SUCURSAL (Si aplica) ---
    if (branchId) {
        transactItems.push({
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: branchSK },
                UpdateExpression: `
                    SET total_co2e = if_not_exists(total_co2e, :zero) + :nCo2e,
                        total_spend = if_not_exists(total_spend, :zero) + :nSpend,
                        #mCo2e = if_not_exists(#mCo2e, :zero) + :nCo2e,
                        last_updated = :now
                `,
                ExpressionAttributeNames: { "#mCo2e": `month_${month}_co2e` },
                ExpressionAttributeValues: { ":nCo2e": nCo2e, ":nSpend": nSpend, ":zero": 0, ":now": now }
            }
        });
    }

    // --- D. ACTUALIZACIÓN DE ACTIVO (Si aplica) ---
    if (assetId) {
        transactItems.push({
            Update: {
                TableName: TABLE_NAME,
                Key: { PK, SK: assetSK },
                UpdateExpression: `
                    SET total_co2e = if_not_exists(total_co2e, :zero) + :nCo2e,
                        #mCo2e = if_not_exists(#mCo2e, :zero) + :nCo2e,
                        last_updated = :now
                `,
                ExpressionAttributeNames: { "#mCo2e": `month_${month}_co2e` },
                ExpressionAttributeValues: { ":nCo2e": nCo2e, ":zero": 0, ":now": now }
            }
        });
    }

    // --- E. ACTUALIZACIÓN DE PROVEEDOR (Scope 3) ---
    transactItems.push({
        Update: {
            TableName: TABLE_NAME,
            Key: { PK, SK: vendorSK },
            UpdateExpression: `
                SET total_co2e = if_not_exists(total_co2e, :zero) + :nCo2e,
                    total_invoices = if_not_exists(total_invoices, :zero) + :one,
                    last_invoice_date = :now,
                    service_type = :service
            `,
            ExpressionAttributeValues: { 
                ":nCo2e": nCo2e, 
                ":one": 1, 
                ":zero": 0, 
                ":now": now, 
                ":service": service 
            }
        }
    });

    try {
        await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
        console.log(`✅ [TRANSACTION_SUCCESS]: Registro ${record.SK} y agregadores actualizados correctamente.`);
        return { success: true };
    } catch (error) {
        if (error.name === "TransactionCanceledException") {
            if (error.CancellationReasons[0].Code === "ConditionalCheckFailed") {
                console.warn(`⏭️ [SKIPPED]: La factura ya existe en el sistema. Evitando duplicidad.`);
                return { success: false, reason: "DUPLICATE" };
            }
        }
        console.error("❌ [DB_ERROR]: Falló la transacción de persistencia:", error);
        throw error;
    }
};

export default { persistTransaction };