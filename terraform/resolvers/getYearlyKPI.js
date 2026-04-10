import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "sms-platform-dev-emissions";

const QueryResolvers = {
  getYearlyKPI: async (_, { year }, context) => {
    // 1. Extraemos el ID de la organización del contexto de auth
    const orgId = context.orgId || "f3d4f8a2-90c1-708c-a446-2c8592524d62"; 

    // 2. Construimos la SK según el patrón que me mostraste
    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: `ORG#${orgId}`,
        SK: `STATS#YEAR#${year}#TOTAL`
      },
    };

    try {
      const { Item } = await docClient.send(new GetCommand(params));

      if (!Item) {
        return null; // O lanzar un error amigable
      }

      // 3. Mapeo de la estructura de la DB (snake_case) al esquema GraphQL (camelCase)
      return {
        totalCo2e: parseFloat(Item.total_co2e),
        totalSpend: parseFloat(Item.total_spend),
        invoiceCount: parseInt(Item.invoice_count),
        // En tu JSON no veo 'byService' ni 'lastFile', 
        // así que devolvemos valores por defecto o calculados
        lastFile: "Ver historial", 
        byService: {
          ELEC: Item.total_co2e, // Ajustar si luego agregas desglose por servicio
          GAS: 0
        }
      };
    } catch (error) {
      console.error("Error consultando DynamoDB:", error);
      throw new Error("No se pudo recuperar la estadística anual.");
    }
  },

  getMonthlyKPI: async (_, { year, month }, context) => {
    const orgId = context.orgId || "f3d4f8a2-90c1-708c-a446-2c8592524d62";
    
    // El formato del mes debe coincidir con tu DB (ej: "05")
    const formattedMonth = month.toString().padStart(2, '0');
    
    // Nota: Tu SK incluye el QUARTER. 
    // Si no conoces el Quarter, podrías necesitar un Query con BeginsWith 
    // pero si es fijo (Q2 para Mayo), la clave queda así:
    const quarter = Math.ceil(parseInt(month) / 3);

    const params = {
      TableName: TABLE_NAME,
      Key: {
        PK: `ORG#${orgId}`,
        SK: `STATS#YEAR#${year}#QUARTER#${quarter}#MONTH#${formattedMonth}`
      },
    };

    try {
      const { Item } = await docClient.send(new GetCommand(params));
      if (!Item) return null;

      return {
        month: formattedMonth,
        year: year,
        emissions: {
          value: parseFloat(Item.total_co2e),
          previousValue: 0, // Requiere una segunda consulta para el mes anterior
          diffPercentage: 0
        },
        spend: {
          value: parseFloat(Item.total_spend),
          previousValue: 0,
          diffPercentage: 0
        }
      };
    } catch (error) {
      console.error("Error:", error);
      throw new Error("Error al obtener KPI mensual.");
    }
  }
};