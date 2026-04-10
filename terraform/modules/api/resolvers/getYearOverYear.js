import { util } from '@aws-appsync/utils';

export function request(ctx) {
    // 1. Extraemos los argumentos como String (según tu nuevo orden)
    const { year, month } = ctx.arguments;
    const orgId = ctx.identity?.claims?.['custom:organization_id'] || "f3d4f8a2-90c1-708c-a446-2c8592524d62";

    // 2. Coerción segura para lógica matemática
    const currentYearNum = year * 1;
    const previousYearNum = currentYearNum - 1;
    const mNum = month * 1;

    // 3. Cálculo de Quarter (Trimestre)
    let q = "1";
    if (mNum > 3) q = "2";
    if (mNum > 6) q = "3";
    if (mNum > 9) q = "4";

    // 4. Formateo de mes con padding (ej: "5" -> "05")
    const mm = mNum < 10 ? "0" + mNum : "" + mNum;

    return {
        operation: 'BatchGetItem',
        tables: {
            "SustainabilityManagementSystem": {
                keys: [
                    util.dynamodb.toMapValues({ 
                        PK: "ORG#" + orgId, 
                        SK: "STATS#YEAR#" + currentYearNum + "#QUARTER#" + q + "#MONTH#" + mm 
                    }),
                    util.dynamodb.toMapValues({ 
                        PK: "ORG#" + orgId, 
                        SK: "STATS#YEAR#" + previousYearNum + "#QUARTER#" + q + "#MONTH#" + mm 
                    })
                ],
                consistentRead: true
            }
        }
    };
}

export function response(ctx) {
    const items = ctx.result.data["SustainabilityManagementSystem"] || [];
    
    // Coerción a número para comparar con year_ref (que es numérico en DB)
    const cYear = ctx.arguments.year * 1;
    const pYear = cYear - 1;

    let currentData = {};
    let previousData = {};

    // Usamos el bucle for más básico posible. 
    // Esto evita cualquier ReferenceError con iteradores de ES6.
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.year_ref === cYear) {
            currentData = item;
        } else if (item.year_ref === pYear) {
            previousData = item;
        }
    }

    // Extraemos valores con fallback a 0
    const cEmissions = currentData.total_co2e || 0;
    const pEmissions = previousData.total_co2e || 0;
    const cSpend = currentData.total_spend || 0;
    const pSpend = previousData.total_spend || 0;

    // Cálculo de diferencias
    const getDiff = (curr, prev) => {
        if (!prev || prev === 0) return 0;
        return ((curr - prev) / prev) * 100;
    };

    const diffEmissions = getDiff(cEmissions, pEmissions);
    const diffSpend = getDiff(cSpend, pSpend);

    // Retorno final exacto a tu Schema
    return {
        month: ctx.arguments.month,
        currentYear: {
            emissions: cEmissions,
            spend: cSpend
        },
        previousYear: {
            emissions: pEmissions,
            spend: pSpend
        },
        diffPercentageEmissions: diffEmissions,
        diffPercentageSpend: diffSpend,
        efficiencyImprovement: diffEmissions < 0
    };
}