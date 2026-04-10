import { util } from '@aws-appsync/utils';

export function request(ctx) {
    const year = ctx.arguments.year;
    const month = ctx.arguments.month;
    const orgId = ctx.identity?.claims?.['custom:organization_id'] || "f3d4f8a2-90c1-708c-a446-2c8592524d62";

    // Convertimos a número usando la operación matemática más básica (coerción implícita)
    // Esto es 100% válido en cualquier motor JS y no requiere funciones globales.
    const mNum = month * 1;
    
    // Si mNum no es un número válido, el resultado será NaN.
    // En AppSync JS validamos NaN comparándolo consigo mismo (NaN !== NaN es true)
    if (mNum !== mNum) {
        util.error("El mes no es un número válidoc", "ValidationError");
    }

    // Lógica de Quarter (Trimestre) con comparaciones directas
    let q = "1";
    if (mNum > 3) q = "2";
    if (mNum > 6) q = "3";
    if (mNum > 9) q = "4";

    // Formateo de mes manual (Padding)
    let mm = "";
    if (mNum < 10) {
        mm = "0" + mNum;
    } else {
        mm = "" + mNum;
    }

    return {
        operation: 'GetItem',
        key: util.dynamodb.toMapValues({
            PK: "ORG#" + orgId,
            SK: "STATS#YEAR#" + year + "#QUARTER#" + q + "#MONTH#" + mm
        }),
    };
}

export function response(ctx) {
    if (ctx.error) {
        util.error(ctx.error.message, ctx.error.type);
    }

    const res = ctx.result;
    if (!res) return null;

    return {
        totalCo2e: res.total_co2e,
        totalSpend: res.total_spend,
        invoiceCount: res.invoice_count,
        lastFile: "Ver historial",
        byService: {
            ELEC: res.total_co2e,
            GAS: 0
        }
    };
}