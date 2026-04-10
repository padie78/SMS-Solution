import { util } from '@aws-appsync/utils';

export function request(ctx) {
    const { year, month } = ctx.arguments;
    const orgId = ctx.identity?.claims?.['custom:organization_id'] || "f3d4f8a2-90c1-708c-a446-2c8592524d62";
    
    // Convertimos a número para asegurar el cálculo
    const mNum = parseInt(month, 10);
    const q = Math.ceil(mNum / 3);
    
    // AppSync JS a veces falla con padStart en el despliegue inicial. 
    // Usamos una lógica más básica y segura:
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

    if (!result) {
        return null;
    }

    // Usamos valores por defecto (|| 0) para evitar que GraphQL reciba undefined 
    // en campos obligatorios (Float/Int).
    const eVal = result.total_co2e || 0;
    const ePrev = result.previous_total_co2e || 0;
    const sVal = result.total_spend || 0;
    const sPrev = result.previous_total_spend || 0;

    return {
        month: "" + (result.month_ref || ""),
        year: "" + (result.year_ref || ""),
        emissions: {
            value: eVal,
            previousValue: ePrev,
            diffPercentage: result.emissions_diff || 0
        },
        spend: {
            value: sVal,
            previousValue: sPrev,
            diffPercentage: result.spend_diff || 0
        },
        isEmissionsUp: eVal > ePrev,
        isSpendUp: sVal > sPrev
    };
}