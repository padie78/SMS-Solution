import { unmarshall } from "@aws-sdk/util-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event) => {
    for (const record of event.Records) {
        if (record.eventName !== "MODIFY") continue;

        // Convertimos el formato DynamoDB a JSON normal
        const newImage = unmarshall(record.dynamodb.NewImage);
        
        const { PK, ai_analysis, extracted_data } = newImage;
        const orgId = PK.split('#')[1];
        const magnitude = ai_analysis.total_magnitude_sum;
        const amount = extracted_data.total_amount;
        const dateStr = extracted_data.billing_period.end; // "2026-03-31"

        // Cálculos de periodos
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const quarter = Math.ceil(month / 3);
        
        // Helper para obtener el número de semana del año
        const getWeek = (d) => {
            const onejan = new Date(d.getFullYear(), 0, 1);
            return Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
        };
        const week = getWeek(date);

        // 3. Ejecutar los incrementos atómicos (ADD)
        // Esto actualiza todos tus niveles (Año, Trimestre, Mes, Semana, Día)
        const updates = [
            `KPI#YEAR#${year}`,
            `KPI#QUARTER#${year}Q${quarter}`,
            `KPI#MONTH#${year}-${month.toString().padStart(2, '0')}`,
            `KPI#WEEK#${year}-W${week}`,
            `KPI#DAY#${dateStr}`
        ];

        const updatePromises = updates.map(sk => {
            return ddbDocClient.send(new UpdateCommand({
                TableName: process.env.MAIN_TABLE,
                Key: { PK: `ORG#${orgId}`, SK: sk },
                UpdateExpression: "ADD totalCo2eKg :co2, totalSpend :spend, invoiceCount :inc",
                ExpressionAttributeValues: {
                    ":co2": ai_analysis.sustainability.co2_kg,
                    ":spend": amount,
                    ":inc": 1
                }
            }));
        });

        await Promise.all(updatePromises);
    }
    
    return { status: "Aggregated successfully" };
};