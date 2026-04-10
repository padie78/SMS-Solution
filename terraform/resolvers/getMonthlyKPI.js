import { util } from '@aws-appsync/utils';

export function request(ctx) {
    const { year, month } = ctx.arguments;
    const orgId = ctx.identity?.claims?.['custom:organization_id'] || "f3d4f8a2-90c1-708c-a446-2c8592524d62";
    
    const monthNum = parseInt(month, 10);
    const quarter = Math.ceil(monthNum / 3);
    const monthStr = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;

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

    // Lógica para determinar si subió (asumiendo que tienes previous_value en la DB)
    // Si no tienes el valor anterior aún, lo seteamos por defecto en false
    const emissionsValue = result.total_co2e || 0;
    const previousEmissions = result.previous_total_co2e || 0;
    
    const spendValue = result.total_spend || 0;
    const previousSpend = result.previous_total_spend || 0;

    return {
        month: `${result.month_ref}`,
        year: `${result.year_ref}`,
        emissions: {
            value: emissionsValue,
            previousValue: previousEmissions,
            diffPercentage: result.emissions_diff || 0
        },
        spend: {
            value: spendValue,
            previousValue: previousSpend,
            diffPercentage: result.spend_diff || 0
        },
        // Calculamos los booleanos dinámicamente
        isEmissionsUp: emissionsValue > previousEmissions,
        isSpendUp: spendValue > previousSpend
    };
}