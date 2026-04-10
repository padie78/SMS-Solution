import { util } from '@aws-appsync/utils';

export function request(ctx) {
    // Usamos la misma desestructuración que te funcionó en Año
    const { year, month } = ctx.arguments;
    const orgId = ctx.identity?.claims?.['custom:organization_id'] || "f3d4f8a2-90c1-708c-a446-2c8592524d62";

    // Reemplazamos Math.ceil y lógica compleja por algo más directo
    // que AppSync valide sin problemas:
    const m = parseInt(month, 10);
    let q = 1;
    if (m > 3) q = 2;
    if (m > 6) q = 3;
    if (m > 9) q = 4;

    // Formateo de mes con padding manual simple
    const mm = m < 10 ? `0${m}` : `${m}`;

    return {
        operation: 'GetItem',
        key: util.dynamodb.toMapValues({
            PK: `ORG#${orgId}`,
            SK: `STATS#YEAR#${year}#QUARTER#${q}#MONTH#${mm}`
        }),
    };
}

export function response(ctx) {
    const { result, error } = ctx;

    if (error) {
        util.error(error.message, error.type);
    }

    if (!result) {
        return null;
    }

    return {
        totalCo2e: result.total_co2e,
        totalSpend: result.total_spend,
        invoiceCount: result.invoice_count,
        lastFile: "Ver historial",
        byService: {
            ELEC: result.total_co2e,
            GAS: 0
        }
    };
}