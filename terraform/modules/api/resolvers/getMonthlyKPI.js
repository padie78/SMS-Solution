import { util } from '@aws-appsync/utils';

export function request(ctx) {
    // 1. Extraer y limpiar argumentos
    const year = ctx.arguments.year;
    const month = ctx.arguments.month;
    const orgId = ctx.identity?.claims?.['custom:organization_id'] || "f3d4f8a2-90c1-708c-a446-2c8592524d62";
    
    // 2. Normalizar Mes y Quarter
    const mNum = parseInt(month, 10);
    if (isNaN(mNum)) {
        util.error("El mes proporcionado no es válido: " + month, "ValidationError");
    }
    
    const q = Math.ceil(mNum / 3);
    const mm = mNum < 10 ? "0" + mNum : "" + mNum;

    // 3. Construir la SK EXACTA
    const pk = "ORG#" + orgId;
    const sk = "STATS#YEAR#" + year + "#QUARTER#" + q + "#MONTH#" + mm;

    // Log para debug (Ver en CloudWatch Logs)
    console.log("Buscando Mensual -> PK: " + pk + " | SK: " + sk);

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
        // Log si no encuentra nada
        console.log("No se encontró registro para los argumentos dados.");
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