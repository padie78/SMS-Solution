import { util } from '@aws-appsync/utils';

export function request(ctx) {
    const { year, month } = ctx.arguments;
    const orgId = ctx.identity?.claims?.['custom:organization_id'] || "f3d4f8a2-90c1-708c-a446-2c8592524d62";

    // Forzamos que month sea número para el cálculo
    const mNum = parseInt(month, 10);
    
    // Cálculo de Quarter (1, 2, 3 o 4)
    let q = 1;
    if (mNum > 3) q = 2;
    if (mNum > 6) q = 3;
    if (mNum > 9) q = 4;

    // El padding "03" es String porque es parte de la SK (que es un String)
    const mm = mNum < 10 ? `0${mNum}` : `${mNum}`;

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

    // AppSync convierte automáticamente los tipos "N" de DynamoDB a números de JS.
    // Solo nos aseguramos de que los nombres coincidan con tu Schema (camelCase).
    return {
        totalCo2e: result.total_co2e,
        totalSpend: result.total_spend,
        invoiceCount: result.invoice_count,
        lastFile: result.last_updated ? `Actualizado el ${result.last_updated}` : "Ver historial",
        byService: {
            ELEC: result.total_co2e,
            GAS: 0
        }
    };
}