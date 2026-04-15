/**
 * @fileoverview Service Layer - Configuración del SMS (Sustainability Management System).
 * Maneja la persistencia en DynamoDB siguiendo Single Table Design.
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto"; // Reemplazo de uuid para evitar errores de módulos

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DATABASE_NAME || "sms-platform-dev-emissions";

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
        return { success: true, id: orgId, entity: JSON.stringify(item) };
    },

    saveUserProfile: async (orgId, input, identity) => {
        const timestamp = new Date().toISOString();
        const item = {
            PK: `ORG#${orgId}`,
            SK: `USER#${input.userId}`,
            entity_type: "USER_PROFILE",
            user_profile: {
                full_name: input.fullName,
                email: input.email,
                interface_language: input.language
            },
            permissions: { role: input.role },
            account_security: { current_status: "ACTIVE" },
            last_updated: timestamp,
            _internal_updated_at: timestamp
        };
        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return { success: true, id: input.userId, entity: JSON.stringify(item) };
    },

    // --- 2. INFRAESTRUCTURA (BRANCHES) ---

    createBranch: async (orgId, input) => {
        // Generación de ID corto usando crypto nativo
        const branchId = `BR-${randomUUID().split('-')[0].toUpperCase()}`;
        const item = {
            PK: `ORG#${orgId}`,
            SK: `BRANCH#${branchId}`,
            entity_type: "BRANCH_CONFIG",
            branch_info: { 
                name: input.name, 
                location: input.location || "N/A" 
            },
            metadata: { created_at: new Date().toISOString() }
        };
        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return { success: true, id: branchId, entity: JSON.stringify(item) };
    },

    updateBranch: async (orgId, branchId, input) => {
        const timestamp = new Date().toISOString();
        const response = await docClient.send(new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { PK: `ORG#${orgId}`, SK: `BRANCH#${branchId}` },
            UpdateExpression: "SET branch_info.name = :n, branch_info.location = :l, last_updated = :t",
            ExpressionAttributeValues: { ":n": input.name, ":l": input.location, ":t": timestamp },
            ReturnValues: "ALL_NEW"
        }));
        return { success: true, id: branchId, entity: JSON.stringify(response.Attributes) };
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
        return { success: true, id: input.branchId, entity: JSON.stringify(item) };
    },

    // --- 3. ACTIVOS (ASSETS) ---

    createAsset: async (orgId, input) => {
        const assetId = `ASSET-${Date.now()}`;
        const timestamp = new Date().toISOString();
        const item = {
            PK: `ORG#${orgId}`,
            SK: `ASSET#${assetId}`,
            entity_type: "ASSET_CONFIG",
            asset_info: { 
                name: input.name, 
                type: input.type, 
                description: input.description, 
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
                scope: 1
            },
            metadata: { created_at: timestamp, version: 1 }
        };
        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return { success: true, id: assetId, entity: JSON.stringify(item) };
    },

    deleteAsset: async (orgId, assetId) => {
        await docClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { PK: `ORG#${orgId}`, SK: `ASSET#${assetId}` }
        }));
        return { success: true, message: "Asset deleted successfully", id: assetId };
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
            metadata: { last_updated: timestamp }
        };
        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return { success: true, id: costCenterId, entity: JSON.stringify(item) };
    },

    saveUtilityTariff: async (orgId, input) => {
        const timestamp = new Date().toISOString();
        const item = {
            PK: `ORG#${orgId}`,
            SK: `TARIFF#${input.branchId}#${input.serviceType.toUpperCase()}`,
            entity_type: "UTILITY_CONFIG",
            provider_info: { name: input.providerName, service_type: input.serviceType },
            tariff_details: {
                unit_rate: input.unitRate,
                fixed_fee: input.fixedFee || 0,
                contracted_power: input.contractedPower || 0,
                currency: input.currency || "ILS"
            },
            last_updated: timestamp
        };
        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return { success: true, id: input.branchId, entity: JSON.stringify(item) };
    },

    // --- 5. OPERACIONES Y FACTURACIÓN ---

    logProduction: async (orgId, input) => {
        const timestamp = new Date().toISOString();
        const item = {
            PK: `ORG#${orgId}`,
            SK: `PROD#${input.period}#${input.branchId}`,
            entity_type: "PRODUCTION_LOG",
            production_metrics: {
                units_produced: input.unitsProduced,
                unit_type: input.unitType
            },
            timestamp: timestamp
        };
        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return { success: true, id: `${input.period}-${input.branchId}`, entity: JSON.stringify(item) };
    },

    approveInvoice: async (orgId, invoiceId, identity) => {
        const timestamp = new Date().toISOString();
        const userEmail = identity?.claims?.email || "SYSTEM";
        
        try {
            const response = await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { PK: `ORG#${orgId}`, SK: invoiceId },
                UpdateExpression: "SET #st = :s, approved_by = :u, approved_at = :t",
                ExpressionAttributeNames: { "#st": "status" },
                ExpressionAttributeValues: { ":s": "APPROVED", ":u": userEmail, ":t": timestamp },
                ReturnValues: "ALL_NEW"
            }));
            
            // Mapeamos SK a id para que AppSync no de error de nulabilidad
            return {
                ...response.Attributes,
                id: response.Attributes.SK
            };
        } catch (error) {
            console.error(`[ERROR approveInvoice] ${error.message}`);
            throw error;
        }
    }
};