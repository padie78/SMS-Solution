import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";
// Importamos las nuevas operaciones de KPIs
import { 
    buildStatsOps, 
    buildVendorOp, 
    buildInfrastructureOps, 
    buildBudgetUpdateOp,
    buildAssetHealthOp,
    buildGoalUpdateOp 
} from "./operations.js";

export const persistTransaction = async (record) => {
    const { PK, SK, extracted_data, analytics_dimensions } = record;
    const now = new Date();
    const isoNow = now.toISOString();

    if (!SK) throw new Error("❌ [DB_ERROR]: El record no contiene un SK válido.");

    const nSpend = Number(extracted_data?.total_amount) || 0;
    const nCo2e = Number(record.climatiq_result?.co2e) || 0;
    
    const year = analytics_dimensions?.period_year || now.getFullYear();
    const month = analytics_dimensions?.period_month || (now.getMonth() + 1);
    const quarter = Math.floor((month - 1) / 3) + 1;

    const taxId = String(extracted_data?.VENDOR_TAX_ID || "UNKNOWN").replace(/[^a-zA-Z0-9]/g, '');
    const vName = extracted_data?.vendor || "UNKNOWN_VENDOR";
    const bId = analytics_dimensions?.branch_id || "MAIN";
    const aId = analytics_dimensions?.asset_id || "GENERIC_ASSET";
    const svc = record.ai_analysis?.service_type || "UNKNOWN";
    
    // ID de la meta (opcional, si la factura contribuye a un objetivo específico)
    const goalId = analytics_dimensions?.goal_id; 

    const transactItems = [
        {
            Put: {
                TableName: TABLE_NAME,
                Item: {
                    ...record,
                    entity_type: "INVOICE",
                    processed_at: isoNow
                },
                ConditionExpression: "attribute_not_exists(SK)"
            }
        },
        ...buildStatsOps(PK, year, month, quarter, nCo2e, nSpend, isoNow),
        buildVendorOp(PK, taxId, vName, nCo2e, isoNow),
        ...buildInfrastructureOps(PK, bId, aId, svc, isoNow),
        buildBudgetUpdateOp(PK, year, nCo2e, isoNow),
        
        // --- NUEVOS KPIs INTEGRADOS ---
        
        // 1. KPI de Salud del Activo: Actualiza el estado basado en el análisis de la factura
        //buildAssetHealthOp(PK, aId, record.ai_analysis?.health_status || "OPERATIONAL", isoNow)
    ];

    // 2. KPI de Metas: Solo si la factura está vinculada a una meta de reducción
    // if (goalId) {
    //     transactItems.push(buildGoalUpdateOp(PK, goalId, nCo2e, isoNow));
    // }

    try {
        console.log(`📡 [DB_ATTEMPT]: Persistiendo factura y KPIs para ${aId}`);
        await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
        return { success: true };
    } catch (error) {
        // ... mismo manejo de errores que ya tenías
        if (error.name === "TransactionCanceledException") {
             // ... logic
        }
        throw error;
    }
};