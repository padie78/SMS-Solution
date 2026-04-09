import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";
import { 
    buildStatsOps, 
    buildVendorOp, 
    buildInfrastructureOps, 
    buildBudgetUpdateOp,
    buildGoalUpdateOp,
    buildAssetHealthOp 
} from "./operations.js";
import { saveEntity } from "./entities.js";

export const persistTransaction = async (record) => {
    const { PK, SK, extracted_data, analytics_dimensions, climatiq_result, ai_analysis } = record;
    const now = new Date();
    const isoNow = now.toISOString();

    // 1. Preparación y extracción segura de variables
    const nSpend = Number(extracted_data?.total_amount || 0);
    const nCo2e = Number(climatiq_result?.co2e || 0);
    const year = analytics_dimensions?.period_year || now.getFullYear();
    const month = analytics_dimensions?.period_month || (now.getMonth() + 1);
    const quarter = Math.floor((month - 1) / 3) + 1;

    // 2. Normalización de IDs y nombres (Evita el error de variables no definidas)
    const taxId = String(extracted_data?.VENDOR_TAX_ID || "UNKNOWN").replace(/[^a-zA-Z0-9]/g, '');
    const vName = extracted_data?.vendor || "UNKNOWN_VENDOR";
    const bId = analytics_dimensions?.branch_id || "MAIN";
    const aId = analytics_dimensions?.asset_id || "GENERIC_ASSET";
    const sType = ai_analysis?.service_type || "UNKNOWN";
    
    // Determinamos un estado de salud inicial basado en el análisis
    const healthStatus = ai_analysis?.anomaly_detected ? "WARNING" : "OPERATIONAL";

    const transactItems = [
        // A. Factura Original
        {
            Put: {
                TableName: TABLE_NAME,
                Item: { ...record, timestamp: isoNow, entity_type: "INVOICE" },
                ConditionExpression: "attribute_not_exists(SK)"
            }
        },

        // B. Agregados temporales (3 registros: Mes, Q, Año)
        ...buildStatsOps(PK, year, month, quarter, nCo2e, nSpend, isoNow),

        // C. Proveedor
        buildVendorOp(PK, taxId, vName, nCo2e, isoNow),

        // D. Sucursal y Activo (2 registros)
        ...buildInfrastructureOps(PK, bId, aId, sType, isoNow),

        // E. Presupuesto Anual
        buildBudgetUpdateOp(PK, year, nCo2e, isoNow),
        
        // F. Meta de reducción (Usamos el año como ID de meta anual por defecto)
        buildGoalUpdateOp(PK, `ANNUAL_GOAL_${year}`, nCo2e, isoNow),
        
        // G. Salud del Activo
        buildAssetHealthOp(PK, aId, healthStatus, isoNow)
    ];

    try {
        await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
        console.log(`✅ [DB_SYNC]: ${SK} persistido con éxito.`);
        return { success: true };
    } catch (error) {
        if (error.name === "TransactionCanceledException") {
            console.error("❌ [DB_CANCELLED]:", error.CancellationReasons);
            return { success: false, reason: "CANCELLED", detail: error.CancellationReasons };
        }
        throw error;
    }
};

export { saveEntity };
export default { persistTransaction, saveEntity };