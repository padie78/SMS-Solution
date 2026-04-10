import { util } from '@aws-appsync/utils';
export function request(ctx) {
    const { year, quarter } = ctx.arguments;
    const orgId = ctx.identity?.claims?.['custom:organization_id'] || "f3d4f8a2-90c1-708c-a446-2c8592524d62";
    return {
        operation: 'GetItem',
        key: util.dynamodb.toMapValues({ PK: `ORG#${orgId}`, SK: `STATS#YEAR#${year}#QUARTER#${quarter}#TOTAL` }),
    };
}
export function response(ctx) {
    return {
        totalCo2e: result.total_co2e,
        totalSpend: result.total_spend,
        invoiceCount: result.invoice_count,
        lastFile: "Ver historial", // Campo estático o mapeado
        byService: {
            ELEC: result.total_co2e, // Ajustar según disponibilidad en DB
            GAS: 0
        }
    };
}