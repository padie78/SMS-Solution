import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";
import { buildStatsOps, buildVendorOp, buildInfrastructureOps } from "./operations.js";
import { saveEntity } from "./entities.js"; // El archivo con PutCommands manuales

export const persistTransaction = async (record) => {
    const { PK, SK, extracted_data, analytics_dimensions, climatiq_result, ai_analysis } = record;
    const now = new Date();
    const isoNow = now.toISOString();

    // Preparación de variables
    const nSpend = Number(extracted_data?.total_amount || 0);
    const nCo2e = Number(climatiq_result?.co2e || 0);
    const year = analytics_dimensions?.period_year || now.getFullYear();
    const month = analytics_dimensions?.period_month || (now.getMonth() + 1);
    const quarter = Math.floor((month - 1) / 3) + 1;

    const taxId = String(extracted_data?.VENDOR_TAX_ID || "UNKNOWN").replace(/[^a-zA-Z0-9]/g, '');
    const branchId = analytics_dimensions?.branch_id || "MAIN";
    const assetId = analytics_dimensions?.asset_id || "GENERIC_ASSET";

    // Unificamos todas las operaciones en una sola transacción atómica
    // En src/services/db/db.js
    const transactItems = [
        // A. Registro de la Factura (Evita duplicados con ConditionExpression)
        {
            Put: {
                TableName: TABLE_NAME,
                Item: {
                    ...record,
                    timestamp: isoNow,
                    entity_type: "INVOICE"
                },
                ConditionExpression: "attribute_not_exists(SK)"
            }
        },

        // B. Estadísticas Agregadas (Mes, Trimestre, Año)
        ...buildStatsOps(PK, year, month, quarter, nCo2e, nSpend, isoNow),

        // C. Perfil del Proveedor (Acumulados y Nombre)
        buildVendorOp(PK, taxId, vendorName, nCo2e, isoNow),

        // D. Infraestructura (Sucursal y Activo)
        ...buildInfrastructureOps(PK, branchId, assetId, serviceType, isoNow),

        // E. Control de Presupuesto (Consumo vs Meta Anual)
        buildBudgetUpdateOp(PK, year, nCo2e, isoNow),
    ];

    try {
        await ddb.send(new TransactWriteCommand({ TransactItems: transactItems }));
        return { success: true };
    } catch (error) {
        if (error.name === "TransactionCanceledException") return { success: false, reason: "CANCELLED" };
        throw error;
    }
};

export { saveEntity };
export default { persistTransaction, saveEntity };