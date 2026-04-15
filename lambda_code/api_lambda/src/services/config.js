/**
 * @fileoverview Service Layer - Configuración del SMS (Sustainability Management System).
 * Maneja la persistencia en DynamoDB siguiendo Single Table Design.
 * Optimizada para Node.js 20, AWS SDK v3 y AppSync.
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
                // Aseguramos que solo actualizamos si el registro existe
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
                scope: input.scope || 2 // Default a Scope 2 (Energía comprada)
            },
            metadata: { created_at: timestamp, version: 1 }
        };

        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return { success: true, ...formatResponse(item) };
    },

    deleteAsset: async (orgId, assetId) => {
        // En niveles profesionales, a veces es mejor un "Soft Delete" (status: DELETED)
        // Pero si requieres borrado físico:
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
            SK: `TARIFF#${input.branchId}#${input.serviceType.toUpperCase()}`,
            entity_type: "UTILITY_CONFIG",
            provider_info: { 
                name: input.providerName, 
                service_type: input.serviceType.toUpperCase() 
            },
            tariff_details: {
                unit_rate: parseFloat(input.unitRate),
                fixed_fee: parseFloat(input.fixedFee || 0),
                currency: input.currency || "ILS"
            },
            last_updated: timestamp
        };

        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return { success: true, ...formatResponse(item) };
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
                unit_type: input.unitType || "UNITS"
            },
            timestamp: timestamp
        };

        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return { success: true, ...formatResponse(item) };
    },

    approveInvoice: async (orgId, invoiceId, identity) => {
        const timestamp = new Date().toISOString();
        const userEmail = identity?.claims?.email || identity?.username || "SYSTEM";
        
        try {
            const response = await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { PK: `ORG#${orgId}`, SK: invoiceId },
                // Solo aprobamos si el ítem existe y no está ya aprobado (Idempotencia)
                ConditionExpression: "attribute_exists(PK) AND #st <> :approved",
                UpdateExpression: "SET #st = :approved, approved_by = :u, approved_at = :t, last_updated = :t",
                ExpressionAttributeNames: { "#st": "status" },
                ExpressionAttributeValues: { 
                    ":approved": "APPROVED", 
                    ":u": userEmail, 
                    ":t": timestamp 
                },
                ReturnValues: "ALL_NEW"
            }));
            
            return {
                success: true,
                ...formatResponse(response.Attributes)
            };
        } catch (error) {
            if (error.name === "ConditionalCheckFailedException") {
                // Si el error es porque ya está aprobado, devolvemos éxito para ser idempotentes
                return { success: true, message: "Invoice already approved or not found" };
            }
            console.error(`[ERROR approveInvoice] ${error.message}`);
            throw error;
        }
    }
};