import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

/**
 * Persistencia Atómica: Write-time Aggregation para SMS Platform.
 * El nombre de la tabla está hardcodeado para asegurar consistencia inmediata.
 */
export const persistTransaction = async (record, ddb) => {
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

    // 2. Normalización de SKs
    const statsSK = `STATS#${year}`;
    const branchSK = `BRANCH#${branchId}`;
    const assetSK = `ASSET#${assetId}#YEAR#${year}`;
    const vendorSK = `VENDOR#${vendorName.replace(/\s+/g, '_').toUpperCase()}`;

    // 3. Valores Numéricos
    const nCo2e = Number(climatiq_result.co2e || 0);
    const nSpend = Number(extracted_data.total_amount || 0);
    const confidence = Number(ai_analysis.confidence_score || 0);
    const now = new Date().toISOString();

    const transactItems = [
        {
            // --- A. INSERTAR LA FACTURA (Idempotencia) ---
            Put: {
                TableName: "sms-platform-dev-emissions",
                Item: record,
                ConditionExpression: "attribute_not_exists(SK)" 
            }
        },
        {
            // --- B. STATS GLOBALES (Anual + Mensual + Service) ---
            Update: {
                TableName: "sms-platform-dev-emissions",
                Key: { PK, SK: statsSK },
                UpdateExpression: `
                    SET #mCo2e = if_not_exists(#mCo2e, :zero) + :nCo2e,
                        #mSpend = if_not_exists(#mSpend, :zero) + :nSpend,
                        #sCo2e = if_not_exists(#sCo2e, :zero) + :nCo2e,
                        total_co2e_kg = if_not_exists(total_co2e_kg, :zero) + :nCo2e,
                        total_spend = if_not_exists(total_spend, :zero) + :nSpend,
                        invoice_count = if_not_exists(invoice_count, :zero) + :one,
                        avg_confidence = (if_not_exists(avg_confidence, :zero) + :conf) / if_not_exists(invoice_count, :one),
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

    // --- C. ACTUALIZAR SUCURSAL (Branch Efficiency) ---
    if (branchId) {
        transactItems.push({
            Update: {
                TableName: "sms-platform-dev-emissions",
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

    // --- D. ACTUALIZAR ACTIVO (Asset Monitoring) ---
    if (assetId) {
        transactItems.push({
            Update: {
                TableName: "sms-platform-dev-emissions",
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

    // --- E. ACTUALIZAR PROVEEDOR (Vendor Ranking / Scope 3) ---
    transactItems.push({
        Update: {
            TableName: "sms-platform-dev-emissions",
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
        console.log(`✅ [TRANSACTION_COMPLETE]: Factura ${record.SK} procesada en sms-platform-dev-emissions`);
        return { success: true };
    } catch (error) {
        if (error.name === "TransactionCanceledException") {
            if (error.CancellationReasons[0].Code === "ConditionalCheckFailed") {
                console.warn(`⏭️ [SKIPPED]: Factura duplicada detectada.`);
                return { success: false, reason: "DUPLICATE" };
            }
        }
        console.error("❌ [TRANSACTION_FAILED]:", error);
        throw error;
    }
};

export default { persistTransaction };