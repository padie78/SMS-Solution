import { util } from '@aws-appsync/utils';

export function request(ctx) {
    const { year } = ctx.arguments;
    // Asumimos que el orgId viene de las claims del token (Cognito) 
    // o puedes usar el que pasaste de prueba
    const orgId = ctx.identity?.claims?.['custom:organization_id'] || "f3d4f8a2-90c1-708c-a446-2c8592524d62";

    return {
        operation: 'GetItem',
        key: util.dynamodb.toMapValues({
            PK: `ORG#${orgId}`,
            SK: `STATS#YEAR#${year}#TOTAL`
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

    // Mapeo manual de snake_case (DB) a camelCase (GraphQL)
    // El runtime de AppSync ya maneja la conversión de tipos de DynamoDB
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