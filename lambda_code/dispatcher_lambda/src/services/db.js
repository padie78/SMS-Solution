import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// El cliente base de DynamoDB
const client = new DynamoDBClient({
    region: process.env.AWS_REGION || "eu-central-1"
});

// Configuraciones del DocumentClient para simplificar el manejo de datos
const marshallOptions = {
    convertEmptyValues: true, // Maneja strings vacíos
    removeUndefinedValues: true, // No guarda campos que sean undefined
    convertClassInstanceToMap: true, // Útil si usas clases para tus modelos
};

const unmarshallOptions = {
    wrapNumbers: false, // Devuelve números de JS directamente
};

// Instancia exportable del DocumentClient
export const ddbDocClient = DynamoDBDocumentClient.from(client, {
    marshallOptions,
    unmarshallOptions,
});