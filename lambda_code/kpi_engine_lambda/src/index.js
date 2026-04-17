import { unmarshall } from "@aws-sdk/util-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

    const TABLE_NAME = process.env.DATABASE_NAME || "sms-platform-dev-emissions";

export const handler = async (event) => {
    // Log inicial para ver cuántos registros vienen en el batch
    console.log(`Recibidos ${event.Records.length} registros desde DynamoDB Stream.`);




    for (const record of event.Records) {
        console.log(`Procesando evento: ${record.eventID} - Tipo: ${record.eventName}`);

        if (record.eventName !== "MODIFY") {
            console.log("Evento omitido: No es una modificación (MODIFY).");
            continue;
        }

        try {
            // Convertimos el formato DynamoDB a JSON normal
            const newImage = unmarshall(record.dynamodb.NewImage);
            
            const { PK, ai_analysis, extracted_data } = newImage;
            
            // Log de los datos extraídos para validación
            console.log(`Datos extraídos para PK: ${PK}`, {
                co2: ai_analysis?.sustainability?.co2_kg,
                amount: extracted_data?.total_amount,
                date: extracted_data?.billing_period?.end
            });

            const orgId = PK.split('#')[1];
            const amount = extracted_data.total_amount;
            const dateStr = extracted_data.billing_period.end; // "2026-03-31"

            // Cálculos de periodos
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const quarter = Math.ceil(month / 3);
            
            const getWeek = (d) => {
                const onejan = new Date(d.getFullYear(), 0, 1);
                return Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
            };
            const week = getWeek(date);

            const updates = [
                `KPI#YEAR#${year}`,
                `KPI#QUARTER#${year}Q${quarter}`,
                `KPI#MONTH#${year}-${month.toString().padStart(2, '0')}`,
                `KPI#WEEK#${year}-W${week}`,
                `KPI#DAY#${dateStr}`
            ];

            console.log(`Ejecutando ${updates.length} actualizaciones atómicas para ORG#${orgId}`);

            const updatePromises = updates.map(sk => {
                return ddbDocClient.send(new UpdateCommand({
                    TableName: TABLE_NAME,
                    Key: { PK: `ORG#${orgId}`, SK: sk },
                    UpdateExpression: "ADD totalCo2eKg :co2, totalSpend :spend, invoiceCount :inc",
                    ExpressionAttributeValues: {
                        ":co2": ai_analysis.sustainability.co2_kg || 0,
                        ":spend": amount || 0,
                        ":inc": 1
                    }
                }));
            });

            await Promise.all(updatePromises);
            console.log(`Agregación completada con éxito para la factura en ${dateStr}`);

        } catch (error) {
            console.error(`Error procesando el registro ${record.eventID}:`, error);
            // Dependiendo de tu lógica, aquí podrías re-lanzar el error o continuar
            // throw error; 
        }
    }
    
    return { status: "Aggregated successfully" };
};