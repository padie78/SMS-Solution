/**
 * @fileoverview Service Layer - Configuración del SMS (Sustainability Management System).
 * Maneja la persistencia en DynamoDB siguiendo Single Table Design.
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DATABASE_NAME || "sms-platform-dev-emissions";

/**
 * Helper para formatear las respuestas de éxito consistentes con AppSync/GraphQL
 */
const formatResponse = (attributes, idField = "SK") => ({
    ...attributes,
    id: attributes[idField],
    entity: JSON.stringify(attributes)
});

export const configService = {

    // --- 1. ORGANIZACIÓN Y PERFIL ---

    saveOrgConfig: async (orgId, input) => {
        const timestamp = new Date().toISOString();
        const item = {
            PK: `ORG#${orgId}`,
            SK: `METADATA`,
            entity_type: "ORG_CONFIG",
            corporate_identity: {
                name: input.name,
                tax_id: input.taxId,
                hq_address: input.hqAddress
            },
            system_internal_config: {
                natural_gas_m3_to_kwh: input.gasConversion || 10.55,
                min_confidence_score: input.minConfidence || 0.85,
                default_currency: input.currency || "ILS"
            },
            last_updated: timestamp,
            _internal_updated_at: timestamp
        };

        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return { success: true, ...formatResponse(item) };
    },

    saveUserProfile: async (orgId, input) => {
        const timestamp = new Date().toISOString();
        const item = {
            PK: `ORG#${orgId}`,
            SK: `USER#${input.userId}`,
            entity_type: "USER_PROFILE",
            user_profile: {
                full_name: input.fullName,
                email: input.email,
                interface_language: input.language || "en"
            },
            permissions: { role: input.role || "VIEWER" },
            account_security: { current_status: "ACTIVE" },
            last_updated: timestamp,
            _internal_updated_at: timestamp
        };

        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return { success: true, ...formatResponse(item) };
    },

    // --- 2. INFRAESTRUCTURA (BRANCHES) ---

    createBranch: async (orgId, input) => {
        const branchId = `BR-${randomUUID().split('-')[0].toUpperCase()}`;
        const timestamp = new Date().toISOString();
        const item = {
            PK: `ORG#${orgId}`,
            SK: `BRANCH#${branchId}`,
            entity_type: "BRANCH_CONFIG",
            branch_info: {
                name: input.name,
                location: input.location || "N/A"
            },
            metadata: { created_at: timestamp, status: "ACTIVE" }
        };

        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return { success: true, ...formatResponse(item) };
    },

    updateBranch: async (orgId, branchId, input) => {
        const timestamp = new Date().toISOString();
        try {
            const response = await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { PK: `ORG#${orgId}`, SK: `BRANCH#${branchId}` },
                ConditionExpression: "attribute_exists(PK)",
                UpdateExpression: "SET branch_info.#n = :n, branch_info.location = :l, last_updated = :t",
                ExpressionAttributeNames: { "#n": "name" },
                ExpressionAttributeValues: { ":n": input.name, ":l": input.location, ":t": timestamp },
                ReturnValues: "ALL_NEW"
            }));
            return { success: true, ...formatResponse(response.Attributes) };
        } catch (error) {
            if (error.name === "ConditionalCheckFailedException") throw new Error("BRANCH_NOT_FOUND");
            throw error;
        }
    },

    saveBranchConfig: async (orgId, input) => {
        const timestamp = new Date().toISOString();
        const item = {
            PK: `ORG#${orgId}`,
            SK: `BRANCH_DETAIL#${input.branchId}`,
            entity_type: "BRANCH_EXTENDED_CONFIG",
            details: { ...input },
            last_updated: timestamp
        };
        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return { success: true, ...formatResponse(item) };
    },

    // --- 3. ACTIVOS (ASSETS) ---

    createAsset: async (orgId, input) => {
        const assetId = `ASSET-${randomUUID().split('-')[0].toUpperCase()}`;
        const timestamp = new Date().toISOString();
        const item = {
            PK: `ORG#${orgId}`,
            SK: `ASSET#${assetId}`,
            entity_type: "ASSET_CONFIG",
            asset_info: {
                name: input.name,
                type: input.type,
                description: input.description || "",
                status: "ACTIVE"
            },
            assignment: {
                branch_id: input.branchId || "UNASSIGNED",
                cost_center_id: input.costCenterId || "UNASSIGNED",
                building: input.building || "MAIN",
                area: input.area || "GENERAL"
            },
            emission_data: {
                climatiq_activity_id: input.climatiqId || "pending",
                unit_type: input.unitType || "kWh",
                scope: input.scope || 2
            },
            metadata: { created_at: timestamp, version: 1 }
        };

        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return { success: true, ...formatResponse(item) };
    },

    deleteAsset: async (orgId, assetId) => {
        await docClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { PK: `ORG#${orgId}`, SK: `ASSET#${assetId}` }
        }));
        return { success: true, id: assetId };
    },

    // --- 4. FINANZAS Y TARIFAS ---

    saveCostCenter: async (orgId, input) => {
        const costCenterId = input.id || `CC-${randomUUID().split('-')[0].toUpperCase()}`;
        const timestamp = new Date().toISOString();
        const item = {
            PK: `ORG#${orgId}`,
            SK: `COST_CENTER#${costCenterId}`,
            entity_type: "COST_CENTER_CONFIG",
            cc_info: {
                name: input.name,
                accounting_code: input.accountingCode,
                manager_email: input.managerEmail || "N/A"
            },
            budget_config: { monthly_limit: input.monthlyBudget || 0 },
            last_updated: timestamp
        };

        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return { success: true, ...formatResponse(item) };
    },

    saveUtilityTariff: async (orgId, input) => {
        const timestamp = new Date().toISOString();

        const item = {
            PK: `ORG#${orgId}`,
            // Soporta tanto branchId como la combinación de branch+service
            SK: `TARIFF#${input.branchId}#${input.serviceType.toUpperCase()}`,
            entity_type: "UTILITY_CONFIG",

            provider_info: {
                name: input.providerName || "Desconocido",
                service_type: input.serviceType.toUpperCase()
            },

            tariff_details: {
                // Si viene de la IA, el unitRate ya es el cálculo de (Total/Consumo)
                unit_rate: parseFloat(input.unitRate),
                fixed_fee: parseFloat(input.fixedFee || 0),
                currency: input.currency || "ILS",
                measured_at: input.measuredAt || timestamp // Para trazabilidad de cuándo se calculó
            },

            metadata: {
                // Identificamos si lo cargó un humano o lo calculó el sistema
                calculation_type: input.calculationType || "MANUAL",
                source_invoice: input.sourceInvoice || "N/A",
                last_updated_by: input.userEmail || "system"
            },

            last_updated: timestamp
        };

        await docClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: item
        }));

        return {
            success: true,
            ...item // Devolvemos el objeto completo para el cache de AppSync
        };
    },

    logProduction: async (orgId, input) => {
        const timestamp = new Date().toISOString();
        const item = {
            PK: `ORG#${orgId}`,
            SK: `PROD#${input.period}#${input.branchId}`,
            entity_type: "PRODUCTION_LOG",
            production_metrics: {
                units_produced: parseFloat(input.unitsProduced),
                unit_type: input.unitType || "UNITS"
            },
            timestamp: timestamp
        };

        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return { success: true, ...formatResponse(item) };
    },

    /**
 * Confirma la factura, calcula CO2 y días del periodo.
 * @param {string} orgId - ID de la organización (del token).
 * @param {string} sk - Sort Key de la factura.
 * @param {object} input - Data validada por el usuario.
 */
 confirmInvoice: async (orgId, sk, input) => {
    // 1. Cálculo de días del periodo
    const start = new Date(input.billing_period.start);
    const end = new Date(input.billing_period.end);
    const diffTime = Math.abs(end - start);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    // 2. Cálculo de Huella de Carbono (Factor de emisión)
    // Estos factores deberían venir de tu config de Org, pero aquí usamos defaults:
    const emissionFactors = { 
        ELECTRICITY: 0.19, // kgCO2/kWh
        GAS: 0.202,        // kgCO2/kWh
        FUEL: 2.52         // kgCO2/Litro
    };
    const factor = emissionFactors[input.service_type] || 0;
    const co2Emissions = input.total_magnitude_sum * factor;

    // 3. Preparar el Update para DynamoDB
    const params = {
        TableName: process.env.MAIN_TABLE,
        Key: { PK: `ORG#${orgId}`, SK: sk },
        // Usamos #st para 'status' y #met para 'metadata' porque son reservadas
        UpdateExpression: `SET 
            #met.is_draft = :false,
            #met.#st = :status,
            ai_analysis.status_triage = :done,
            ai_analysis.total_magnitude_sum = :mag,
            ai_analysis.sustainability = :stats,
            extracted_data.vendor_name = :vName,
            extracted_data.total_amount = :total,
            extracted_data.billing_period = :period`,
        ExpressionAttributeNames: {
            "#met": "metadata", // Alias para el mapa metadata
            "#st": "status"     // Alias para la palabra reservada 'status'
        },
        ExpressionAttributeValues: {
            ":false": false,
            ":status": "VALIDATED",
            ":done": "DONE",
            ":mag": input.total_magnitude_sum,
            ":stats": {
                co2_kg: parseFloat(co2Emissions.toFixed(2)),
                days: totalDays,
                daily_avg: parseFloat((input.total_magnitude_sum / totalDays).toFixed(2))
            },
            ":vName": input.extracted_data.vendor_name,
            ":total": input.extracted_data.total_amount,
            ":period": input.billing_period
        }
    };

    await docClient.send(new UpdateCommand(params));
    
    return { 
        success: true, 
        message: "Invoice confirmed and ESG metrics generated." 
    };
},

    
};