import { util } from '@aws-appsync/utils';

export function request(ctx) {
    // 1. Extraemos tanto el año como el cuarto (trimestre) de los argumentos
    const { year, quarter } = ctx.arguments;
    
    // 2. Identificamos la organización
    const orgId = ctx.identity?.claims?.['custom:organization_id'] || "f3d4f8a2-90c1-708c-a446-2c8592524d62";

    return {
        operation: 'GetItem',
        key: util.dynamodb.toMapValues({
            PK: `ORG#${orgId}`,
            // 3. Ajustamos la SK para que apunte al total del cuarto
            // Resultado esperado: STATS#YEAR#2026#QUARTER#2#TOTAL
            SK: `STATS#YEAR#${year}#QUARTER#${quarter}#TOTAL`
        }),
    };
}

export function response(ctx) {
    const { result, error } = ctx;

    // Manejo de errores de ejecución de DynamoDB
    if (error) {
        util.error(error.message, error.type);
    }

    // Si no existe el registro para ese trimestre específico, devolvemos null
    if (!result) {
        return null;
    }

    // Mapeo de los datos del trimestre
    return {
        totalCo2e: result.total_co2e,
        totalSpend: result.total_spend,
        invoiceCount: result.invoice_count,
        lastFile: `Reporte Q${ctx.arguments.quarter}`, 
        byService: {
            ELEC: result.total_co2e,
            GAS: 0
        }
    };
}