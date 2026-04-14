import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event) => {
    const { fieldName, arguments: args } = event;
    const input = args.input;
    const isoNow = new Date().toISOString();

    try {
        let item = {};

        switch (fieldName) {
            case "saveOrgConfig":
                item = {
                    PK: `ORG#${input.orgId}`,
                    SK: "METADATA",
                    entity_type: "ORG_CONFIG",
                    corporate_identity: {
                        name: input.name,
                        tax_id: input.taxId,
                        hq_address: input.hqAddress
                    },
                    system_internal_config: {
                        natural_gas_m3_to_kwh: input.gasConversion || 10.55,
                        min_confidence_score: input.minConfidence || 0.85,
                        default_currency: input.currency || "ILS",
                        measurement_system: "METRIC"
                    },
                    billing_status: {
                        plan_tier: "ENTERPRISE",
                        status: "ACTIVE",
                        renewal_date: "2027-01-01T00:00:00Z"
                    },
                    last_updated: isoNow
                };
                break;

            case "saveBranchConfig":
                item = {
                    PK: `ORG#${input.orgId}`,
                    SK: `BRANCH#${input.branchId}`,
                    entity_type: "BRANCH_CONFIG",
                    branch_details: {
                        name: input.name,
                        location_hierarchy: {
                            buildings: input.buildings || [],
                            areas: input.areas || []
                        }
                    },
                    assets_inventory: [{
                        asset_id: input.assetId,
                        name: "Medidor Principal",
                        climatiq_activity_id: input.climatiqId,
                        assignment: {
                            building: input.buildings?.[0] || "General",
                            area: input.areas?.[0] || "General"
                        }
                    }],
                    local_thresholds: {
                        co2e_monthly_limit_ton: 500.0
                    },
                    last_updated: isoNow
                };
                break;

            case "saveUserProfile":
                item = {
                    PK: `ORG#${input.orgId}`,
                    SK: `USER#${input.userId}`,
                    entity_type: "USER_PROFILE",
                    user_profile: {
                        full_name: input.fullName,
                        email: input.email,
                        interface_language: input.language || "es"
                    },
                    permissions: {
                        role: input.role || "USER",
                        authorized_branches: [] // Se llena según lógica de negocio
                    },
                    ux_settings: {
                        dark_mode: true,
                        push_notifications: true
                    },
                    account_security: {
                        current_status: "ACTIVE",
                        last_status_update: isoNow
                    }
                };
                break;

            default:
                throw new Error("Unknown mutation field");
        }

        await ddb.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: item
        }));

        return { success: true, message: `${item.entity_type} saved successfully` };

    } catch (error) {
        console.error("Error saving configuration:", error);
        return { success: false, message: error.message };
    }
};