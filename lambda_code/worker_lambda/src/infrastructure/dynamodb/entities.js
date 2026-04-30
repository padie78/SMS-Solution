import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";

export const saveEntity = async (orgId, type, id, data) => {
  const skMap = {
    METADATA: `METADATA#INFO`,
    USER: `USER#${id}#PROFILE`,
    BRANCH: `BRANCH#${id}#INFO`,
    ASSET: `ASSET#${id}#INFO`,
    GOAL: `GOAL#${id}`,
    BUDGET: `BUDGET#YEAR#${id}`,
    VENDOR: `VENDOR#${id}#INFO`,
    INVOICE: `INVOICE#${id}`,
    STATS: `STATS#YEAR#${id}`,
    KPI_SUMMARY: `KPI#${id}`
  };

  const SK = skMap[String(type).toUpperCase()];
  if (!SK) throw new Error(`❌ Entidad no soportada o tipo inválido: ${type}`);

  console.log(`📝 [DB_ENTITY]: Persistiendo ${type} | SK: ${SK}`);

  return ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `ORG#${orgId}`,
        SK: SK,
        ...data,
        updatedAt: new Date().toISOString()
      }
    })
  );
};

export const saveTelemetry = async (orgId, targetId, type, data) => {
  const skMap = {
    HEALTH: `ASSET#${targetId}#HEALTH`,
    BASELINE: `ASSET#${targetId}#BASELINE`,
    SENSOR: `SENSOR#${targetId}#DATA`
  };

  const SK = skMap[String(type).toUpperCase()];
  if (!SK) throw new Error(`❌ Tipo de telemetría no soportado: ${type}`);

  console.log(`📡 [DB_TELEMETRY]: Registrando ${type} para ${targetId}`);

  return ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `ORG#${orgId}`,
        SK: SK,
        ...data,
        timestamp: new Date().toISOString()
      }
    })
  );
};

export const saveEmissionFactor = async (year, orgId = "GLOBAL", data) => {
  const pk = orgId === "GLOBAL" ? "GLOBAL" : `ORG#${orgId}`;
  const SK = `EMISSION_FACTOR#YEAR#${year}#CUSTOM`;

  console.log(`🌍 [DB_FACTOR]: Guardando factor ${year} en ${pk}`);

  return ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: pk,
        SK: SK,
        ...data,
        updatedAt: new Date().toISOString()
      }
    })
  );
};

