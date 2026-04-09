import { TABLE_NAME } from "./client.js";

// --- OPERACIONES DE ESTADÍSTICAS ---
export const buildStatsOps = (PK, year, month, quarter, nCo2e, nSpend, isoNow) => {
    const monthStr = month.toString().padStart(2, '0');
    const targets = [
        { sk: `STATS#YEAR#${year}#QUARTER#${quarter}#MONTH#${monthStr}`, meta: true },
        { sk: `STATS#YEAR#${year}#QUARTER#${quarter}#TOTAL`, meta: false },
        { sk: `STATS#YEAR#${year}#TOTAL`, meta: false }
    ];

    return targets.map(({ sk, meta }) => ({
        Update: {
            TableName: TABLE_NAME,
            Key: { PK, SK: sk },
            UpdateExpression: `
                SET total_co2e = if_not_exists(total_co2e, :zero) + :nCo2e,
                    total_spend = if_not_exists(total_spend, :zero) + :nSpend,
                    invoice_count = if_not_exists(invoice_count, :zero) + :one,
                    last_updated = :now
                    ${meta ? ', year_ref = :year, quarter_ref = :q, month_ref = :m' : ''}
            `,
            ExpressionAttributeValues: {
                ":nCo2e": nCo2e, ":nSpend": nSpend, ":one": 1, ":zero": 0, ":now": isoNow,
                ...(meta && { ":year": year, ":q": quarter, ":m": month })
            }
        }
    }));
};

// --- OPERACIÓN DE VENDOR ---
export const buildVendorOp = (PK, taxId, vendorName, nCo2e, isoNow) => ({
    Update: {
        TableName: TABLE_NAME,
        Key: { PK, SK: `VENDOR#${taxId}#INFO` },
        UpdateExpression: `SET total_co2e_contribution = if_not_exists(total_co2e_contribution, :zero) + :nCo2e, vendor_name = :vName, last_active = :now`,
        ExpressionAttributeValues: { ":nCo2e": nCo2e, ":vName": vendorName, ":zero": 0, ":now": isoNow }
    }
});

// --- OPERACIÓN DE BRANCH & ASSET ---
export const buildInfrastructureOps = (PK, branchId, assetId, serviceType, isoNow) => [
    {
        Update: {
            TableName: TABLE_NAME,
            Key: { PK, SK: `BRANCH#${branchId}#INFO` },
            UpdateExpression: "SET last_invoice_date = :now, branch_status = :active",
            ExpressionAttributeValues: { ":now": isoNow, ":active": "ACTIVE" }
        }
    },
    {
        Update: {
            TableName: TABLE_NAME,
            Key: { PK, SK: `ASSET#${assetId}#INFO` },
            UpdateExpression: "SET last_reading = :now, service_type = :svc",
            ExpressionAttributeValues: { ":now": isoNow, ":svc": serviceType }
        }
    }
];