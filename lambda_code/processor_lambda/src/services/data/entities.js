import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";

/**
 * Guarda o actualiza entidades administrativas (Manual)
 * @param {string} orgId - ID de la organización (ej: 'CLIENTE_1')
 * @param {string} type - Tipo de entidad (USER, BRANCH, ASSET, GOAL, BUDGET, METADATA)
 * @param {string} id - Identificador único de la entidad o referencia temporal
 * @param {object} data - Atributos de la entidad
 */
export const saveEntity = async (orgId, type, id, data) => {
    const skMap = {
        'METADATA': `METADATA#INFO`,
        'USER':     `USER#${id}#PROFILE`,
        'BRANCH':   `BRANCH#${id}#INFO`,
        'ASSET':    `ASSET#${id}#INFO`,
        'GOAL':     `GOAL#${id}`,
        'BUDGET':   `BUDGET#YEAR#${id}` // Aquí id suele ser el año (ej: 2026)
    };

    const SK = skMap[type.toUpperCase()];
    if (!SK) throw new Error(`Entidad no soportada: ${type}`);

    console.log(`📝 [DB_ENTITY]: Guardando ${type} con SK: ${SK}`);

    return ddb.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: { 
            PK: `ORG#${orgId}`, 
            SK: SK, 
            ...data, 
            updatedAt: new Date().toISOString() 
        }
    }));
};

/**
 * Guarda datos de telemetría o salud de activos
 */
export const saveTelemetry = async (orgId, assetId, type, data) => {
    const skMap = {
        'HEALTH':   `ASSET#${assetId}#HEALTH`,
        'BASELINE': `ASSET#${assetId}#BASELINE`,
        'SENSOR':   `SENSOR#${assetId}#DATA`
    };

    const SK = skMap[type.toUpperCase()];
    
    return ddb.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: { 
            PK: `ORG#${orgId}`, 
            SK: SK, 
            ...data, 
            timestamp: new Date().toISOString() 
        }
    }));
};

/**
 * Guarda factores de emisión (Globales o Personalizados por Org)
 */
export const saveEmissionFactor = async (year, orgId = 'GLOBAL', data) => {
    const pk = orgId === 'GLOBAL' ? 'GLOBAL' : `ORG#${orgId}`;
    
    return ddb.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: { 
            PK: pk, 
            SK: `EMISSION_FACTOR#YEAR#${year}#CUSTOM`, 
            ...data,
            updatedAt: new Date().toISOString()
        }
    }));
};