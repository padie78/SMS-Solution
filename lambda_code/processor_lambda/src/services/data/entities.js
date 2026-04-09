import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "./client.js";

/**
 * Guarda o actualiza entidades administrativas y de negocio
 * Cubre: METADATA, USER, BRANCH, ASSET, GOAL, BUDGET, VENDOR, INVOICE, STATS
 */
export const saveEntity = async (orgId, type, id, data) => {
    // Mapeo exhaustivo de Sort Keys según tu esquema
    const skMap = {
        'METADATA': `METADATA#INFO`,
        'USER':     `USER#${id}#PROFILE`,
        'BRANCH':   `BRANCH#${id}#INFO`,
        'ASSET':    `ASSET#${id}#INFO`,
        'GOAL':     `GOAL#${id}`,
        'BUDGET':   `BUDGET#YEAR#${id}`,
        'VENDOR':   `VENDOR#${id}#INFO`,     // id = taxId
        'INVOICE':  `INVOICE#${id}`,          // id = date#invId
        'STATS':    `STATS#YEAR#${id}`,        // id = year#MONTH#month
        'KPI_SUMMARY': `KPI#${id}`, // id puede ser 'GLOBAL', 'SUCURSALES', 'ACTIVOS'
    };

    const SK = skMap[type.toUpperCase()];
    if (!SK) throw new Error(`❌ Entidad no soportada o tipo inválido: ${type}`);

    console.log(`📝 [DB_ENTITY]: Persistiendo ${type} | SK: ${SK}`);

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
 * Guarda datos de telemetría, salud y sensores
 * Cubre: HEALTH, BASELINE, SENSOR
 */
export const saveTelemetry = async (orgId, targetId, type, data) => {
    const skMap = {
        'HEALTH':   `ASSET#${targetId}#HEALTH`,
        'BASELINE': `ASSET#${targetId}#BASELINE`,
        'SENSOR':   `SENSOR#${targetId}#DATA`
    };

    const SK = skMap[type.toUpperCase()];
    if (!SK) throw new Error(`❌ Tipo de telemetría no soportado: ${type}`);
    
    console.log(`📡 [DB_TELEMETRY]: Registrando ${type} para ${targetId}`);

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
 * Guarda factores de emisión personalizados o globales
 * Cubre: EMISSION_FACTOR#YEAR#${year}#CUSTOM
 */
export const saveEmissionFactor = async (year, orgId = 'GLOBAL', data) => {
    const pk = orgId === 'GLOBAL' ? 'GLOBAL' : `ORG#${orgId}`;
    const SK = `EMISSION_FACTOR#YEAR#${year}#CUSTOM`;
    
    console.log(`🌍 [DB_FACTOR]: Guardando factor ${year} en ${pk}`);

    return ddb.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: { 
            PK: pk, 
            SK: SK, 
            ...data,
            updatedAt: new Date().toISOString()
        }
    }));
};