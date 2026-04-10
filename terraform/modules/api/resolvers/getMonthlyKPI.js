import { util } from '@aws-appsync/utils';

export function request(ctx) {
    const { year, month } = ctx.arguments;
    const orgId = ctx.identity?.claims?.['custom:organization_id'] || "f3d4f8a2-90c1-708c-a446-2c8592524d62";
    
    const mNum = parseInt(month, 10);
    const q = Math.ceil(mNum / 3);
    const mm = mNum < 10 ? "0" + mNum : "" + mNum;

    return {
        operation: 'GetItem',
        key: util.dynamodb.toMapValues({
            PK: "ORG#" + orgId,
            SK: "STATS#YEAR#" + year + "#QUARTER#" + q + "#MONTH#" + mm
        }),
    };
}

export function response(ctx) {
    const { result } = ctx;

    if (!result) return null;

    // Mapeo directo a YearlyKPI usando los nombres exactos de tu JSON de DynamoDB
    return {
        totalCo2e: result.total_co2e,
        totalSpend: result.total_spend,
        invoiceCount: result.invoice_count,
        lastFile: "Actualizado: " + result.last_updated,
        byService: {
            ELEC: result.total_co2e, // O la lógica de desglose que prefieras
            GAS: 0
        }
    };
}