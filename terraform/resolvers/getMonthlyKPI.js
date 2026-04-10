import { util } from '@aws-appsync/utils';

export function request(ctx) {
    const { year, month } = ctx.arguments;
    const orgId = ctx.identity?.claims?.['custom:organization_id'] || "f3d4f8a2-90c1-708c-a446-2c8592524d62";
    
    // Lógica de formateo
    const monthNum = parseInt(month);
    const quarter = Math.ceil(monthNum / 3);
    const monthStr = month.toString().padStart(2, '0');

    return {
        operation: 'GetItem',
        key: util.dynamodb.toMapValues({
            PK: `ORG#${orgId}`,
            SK: `STATS#YEAR#${year}#QUARTER#${quarter}#MONTH#${monthStr}`
        }),
    };
}

export function response(ctx) {
    const { result } = ctx;
    if (!result) return null;

    return {
        month: result.month_ref.toString(),
        year: result.year_ref.toString(),
        emissions: {
            value: result.total_co2e,
            previousValue: 0,
            diffPercentage: 0
        },
        spend: {
            value: result.total_spend,
            previousValue: 0,
            diffPercentage: 0
        }
    };
}