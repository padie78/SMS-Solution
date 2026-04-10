import { util } from '@aws-appsync/utils';

export function request(ctx) {
    const { year, month } = ctx.arguments;
    const orgId = ctx.identity?.claims?.['custom:organization_id'] || "f3d4f8a2-90c1-708c-a446-2c8592524d62";

    // Cálculos de años (ya son Int por el Schema, pero aseguramos con operación matemática)
    const currentYear = year;
    const previousYear = year - 1;

    // Cálculo de Quarter para las SKs
    const getQuarter = (m) => {
        if (m > 9) return 4;
        if (m > 6) return 3;
        if (m > 3) return 2;
        return 1;
    };

    const qCurrent = getQuarter(month);
    const qPrevious = getQuarter(month); // El quarter es el mismo para el mismo mes

    // Formateo de mes manual para la SK (ej: 3 -> "03")
    const mm = month < 10 ? "0" + month : "" + month;

    return {
        operation: 'BatchGetItem',
        tables: {
            "sms-platform-dev-emissions": { // Asegúrate que este sea el nombre real de tu tabla
                keys: [
                    util.dynamodb.toMapValues({ 
                        PK: "ORG#" + orgId, 
                        SK: "STATS#YEAR#" + currentYear + "#QUARTER#" + qCurrent + "#MONTH#" + mm 
                    }),
                    util.dynamodb.toMapValues({ 
                        PK: "ORG#" + orgId, 
                        SK: "STATS#YEAR#" + previousYear + "#QUARTER#" + qPrevious + "#MONTH#" + mm 
                    })
                ],
                consistentRead: true
            }
        }
    };
}

export function response(ctx) {
    // Acceso a los datos devueltos por BatchGetItem
    const items = ctx.result.data["SustainabilityManagementSystem"] || [];
    
    const cYear = ctx.arguments.year;
    const pYear = cYear - 1;

    // Buscamos cada registro en el array de resultados
    const currentData = items.find(i => i.year_ref === cYear) || {};
    const previousData = items.find(i => i.year_ref === pYear) || {};

    // Helper para cálculos porcentuales seguros
    const cEmissions = currentData.total_co2e || 0;
    const pEmissions = previousData.total_co2e || 0;
    const cSpend = currentData.total_spend || 0;
    const pSpend = previousData.total_spend || 0;

    const getDiff = (curr, prev) => {
        if (prev === 0) return 0;
        return ((curr - prev) / prev) * 100;
    };

    const diffEmissions = getDiff(cEmissions, pEmissions);

    return {
        month: ctx.arguments.month,
        currentYear: {
            totalCo2e: cEmissions,
            totalSpend: cSpend,
            invoiceCount: currentData.invoice_count || 0
        },
        previousYear: {
            totalCo2e: pEmissions,
            totalSpend: pSpend,
            invoiceCount: previousData.invoice_count || 0
        },
        diffPercentageEmissions: diffEmissions,
        diffPercentageSpend: getDiff(cSpend, pSpend),
        efficiencyImprovement: diffEmissions < 0 // Mejora si las emisiones bajaron
    };
}