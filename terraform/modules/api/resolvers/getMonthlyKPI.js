import { util } from '@aws-appsync/utils';

export function request(ctx) {
    const { year, month } = ctx.arguments;
    const orgId = ctx.identity?.claims?.['custom:organization_id'] || "f3d4f8a2-90c1-708c-a446-2c8592524d62";
    
    // Normalizar Mes
    const mNum = parseInt(month, 10);
    if (isNaN(mNum)) {
        util.error("El mes proporcionado no es válido: " + month, "ValidationError");
    }
    
    const q = Math.ceil(mNum / 3);
    const mm = mNum < 10 ? "0" + mNum : "" + mNum;

    // Construcción de llaves
    const pk = "ORG#" + orgId;
    const sk = "STATS#YEAR#" + year + "#QUARTER#" + q + "#MONTH#" + mm;

    return {
        operation: 'GetItem',
        key: util.dynamodb.toMapValues({
            PK: pk,
            SK: sk
        }),
    };
}

export function response(ctx) {
    if (ctx.error) {
        util.error(ctx.error.message, ctx.error.type);
    }

    const res = ctx.result;

    if (!res) {
        return null;
    }

    return {
        totalCo2e: res.total_co2e || 0,
        totalSpend: res.total_spend || 0,
        invoiceCount: res.invoice_count || 0,
        lastFile: res.last_updated ? "Actualizado el " + res.last_updated : "Ver historial",
        byService: {
            ELEC: res.total_co2e || 0,
            GAS: 0
        }
    };
}