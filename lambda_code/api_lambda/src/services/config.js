/**
 * @fileoverview Service Layer - Configuración del SMS (Sustainability Management System).
 * Maneja la persistencia en DynamoDB siguiendo Single Table Design.
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

import { identifyCategory } from "./ia/classifier.js";
import { analyzeInvoice } from "./ia/bedrock.js";
import { calculateFootprint } from "./apis/climatiq.js";
import { buildGoldenRecord } from "../utils/mapper.js";
import { persistTransaction } from "./data/db.js";

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

            // 1. Identidad Corporativa y Globalización
            corporate_identity: {
                name: input.name || "SMS Be'er Sheva Global",
                tax_id: input.taxId || "ISR-123",
                hq_address: input.hqAddress || "South District, Be'er Sheva",
                total_global_m2: Number(input.totalGlobalM2) || 15000,
                industry_sector: input.industrySector || "MANUFACTURING"
            },

            // 2. Configuración de Inteligencia y Eficiencia
            system_internal_config: {
                default_currency: input.currency || "ILS",
                reporting_currency: input.reportingCurrency || "USD",
                min_confidence_score: Number(input.minConfidence) || 0.85,
                natural_gas_m3_to_kwh: Number(input.gasConversion) || 10.55,
                reference_unit_rate: Number(input.referenceUnitRate) || 0.15,
                carbon_tax_shadow_price: Number(input.carbonShadowPrice) || 50.00
            },

            // 3. Estándares de Sustentabilidad (Compliance)
            sustainability_standards: {
                baseline_year: Number(input.baselineYear) || 2024,
                ghg_protocol_methodology: input.ghgMethodology || "LOCATION_BASED",
                reduction_target_pct: Number(input.reductionTarget) || 0.40,
                target_year: Number(input.targetYear) || 2030
            },

            // 4. Resumen de Estructura (Control para el Pipeline)
            org_hierarchy_summary: {
                active_branches: Number(input.activeBranches) || 0,
                total_assets_tracked: Number(input.totalAssets) || 0,
                subscription_plan: input.subscriptionPlan || "ENTERPRISE"
            },

            last_updated: timestamp,
            _internal_updated_at: timestamp
        };

        try {
            await docClient.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: item
            }));

            // Devolvemos el objeto formateado según tu helper
            return {
                success: true,
                ...formatResponse(item)
            };
        } catch (error) {
            console.error("Error saving Org Config:", error);
            return { success: false, error: error.message };
        }
    },
    updateOrgConfig: async (orgId, input) => {
        const timestamp = new Date().toISOString();

        const updates = [];
        const attrValues = { ":t": timestamp };
        const attrNames = {
            "#ci": "corporate_identity",
            "#sic": "system_internal_config",
            "#ss": "sustainability_standards"
        };

        // --- 1. Identidad Corporativa ---
        if (input.name) { updates.push("#ci.#n = :n"); attrNames["#n"] = "name"; attrValues[":n"] = input.name; }
        if (input.taxId) { updates.push("#ci.tax_id = :tid"); attrValues[":tid"] = input.taxId; }
        if (input.industrySector) { updates.push("#ci.industry_sector = :isec"); attrValues[":isec"] = input.industrySector; }

        // --- 2. Configuración de Inteligencia (Energy Intelligence) ---
        if (input.currency) { updates.push("#sic.default_currency = :cur"); attrValues[":cur"] = input.currency; }
        if (input.reportingCurrency) { updates.push("#sic.reporting_currency = :rcur"); attrValues[":rcur"] = input.reportingCurrency; }
        if (input.gasConversion) { updates.push("#sic.natural_gas_m3_to_kwh = :gc"); attrValues[":gc"] = Number(input.gasConversion); }
        if (input.carbonShadowPrice) { updates.push("#sic.carbon_tax_shadow_price = :csp"); attrValues[":csp"] = Number(input.carbonShadowPrice); }

        // --- 3. Estándares de Sostenibilidad (Compliance) ---
        if (input.reductionTarget) { updates.push("#ss.reduction_target_pct = :rt"); attrValues[":rt"] = Number(input.reductionTarget); }
        if (input.ghgMethodology) { updates.push("#ss.ghg_protocol_methodology = :ghg"); attrValues[":ghg"] = input.ghgMethodology; }

        if (updates.length === 0) return { success: false, message: "No fields to update" };

        try {
            const response = await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { PK: `ORG#${orgId}`, SK: `METADATA` },
                ConditionExpression: "attribute_exists(PK)",
                UpdateExpression: `SET ${updates.join(", ")}, last_updated = :t, _internal_updated_at = :t`,
                ExpressionAttributeNames: attrNames,
                ExpressionAttributeValues: attrValues,
                ReturnValues: "ALL_NEW"
            }));

            return {
                success: true,
                message: "Organization configuration updated",
                ...formatResponse(response.Attributes)
            };
        } catch (error) {
            if (error.name === "ConditionalCheckFailedException") {
                throw new Error("ORGANIZATION_NOT_FOUND");
            }
            console.error("UpdateOrgConfig Error:", error);
            throw error;
        }
    },


    // --- 2. INFRAESTRUCTURA (BRANCHES) ---

    createBranch: async (orgId, input) => {
        // Generamos un ID con prefijo regional si viene en el input, sino genérico
        const branchId = input.branchId || `BR-${randomUUID().split('-')[0].toUpperCase()}`;
        const timestamp = new Date().toISOString();

        const item = {
            PK: `ORG#${orgId}`,
            SK: `BRANCH#${branchId}`,
            entity_type: "BRANCH_CONFIG",

            // 1. Información Física y Geográfica
            branch_info: {
                name: input.name || "Nueva Planta",
                m2_surface: Number(input.m2Surface) || 0,
                m3_volume: Number(input.m3Volume) || 0, // Clave para HVAC
                manager: input.manager || "Pendiente Asignación",
                facility_type: input.facilityType || "MANUFACTURING",
                timezone: input.timezone || "Asia/Jerusalem",
                geo_location: input.geoLocation || "0,0"
            },

            // 2. Parámetros Operativos (KPIs para el motor de Inteligencia)
            operational_params: {
                energy_target_kwh_ton: Number(input.energyTarget) || 0,
                carbon_budget_local: Number(input.carbonBudget) || 0,
                baseload_threshold_kw: Number(input.baseloadThreshold) || 0, // Consumo vampiro
                max_power_capacity_kva: Number(input.maxPowerCapacity) || 0, // Evitar multas
                operating_hours_type: input.operatingHours || "24/7"
            },

            // 3. Datos de Cumplimiento y Auditoría
            compliance_data: {
                local_emission_factor: Number(input.emissionFactor) || 0.452,
                iso_50001_certified: Boolean(input.isIsoCertified) || false,
                last_energy_audit: input.lastAuditDate || timestamp
            },

            // 4. Clasificación y Ruteo
            tags: {
                region: input.region || "UNKNOWN",
                criticality: input.criticality || "MEDIUM",
                cost_center_primary: input.primaryCC || "N/A"
            },

            last_updated: timestamp,
            metadata: {
                created_at: timestamp,
                status: "ACTIVE",
                created_by: input.userId || "system"
            }
        };

        try {
            await docClient.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: item
            }));

            return {
                success: true,
                branchId: branchId,
                ...formatResponse(item)
            };
        } catch (error) {
            console.error("Error creating Branch:", error);
            return { success: false, error: error.message };
        }
    },

    updateBranch: async (orgId, branchId, input) => {
        const timestamp = new Date().toISOString();

        // Mapeo de campos para construcción dinámica del UpdateExpression
        const updates = [];
        const attrValues = { ":t": timestamp };
        const attrNames = { "#bi": "branch_info", "#op": "operational_params", "#cd": "compliance_data" };

        // --- 1. Información Física ---
        if (input.name) { updates.push("#bi.#n = :n"); attrNames["#n"] = "name"; attrValues[":n"] = input.name; }
        if (input.m2Surface) { updates.push("#bi.m2_surface = :m2"); attrValues[":m2"] = Number(input.m2Surface); }
        if (input.m3Volume) { updates.push("#bi.m3_volume = :m3"); attrValues[":m3"] = Number(input.m3Volume); }
        if (input.manager) { updates.push("#bi.manager = :mgr"); attrValues[":mgr"] = input.manager; }

        // --- 2. Parámetros Operativos (Inteligencia) ---
        if (input.energyTarget) { updates.push("#op.energy_target_kwh_ton = :et"); attrValues[":et"] = Number(input.energyTarget); }
        if (input.baseloadThreshold) { updates.push("#op.baseload_threshold_kw = :bt"); attrValues[":bt"] = Number(input.baseloadThreshold); }
        if (input.maxPowerCapacity) { updates.push("#op.max_power_capacity_kva = :mp"); attrValues[":mp"] = Number(input.maxPowerCapacity); }

        // --- 3. Cumplimiento y Tags ---
        if (input.emissionFactor) { updates.push("#cd.local_emission_factor = :ef"); attrValues[":ef"] = Number(input.emissionFactor); }
        if (input.isIsoCertified !== undefined) { updates.push("#cd.iso_50001_certified = :iso"); attrValues[":iso"] = Boolean(input.isIsoCertified); }
        if (input.region) { updates.push("tags.region = :reg"); attrValues[":reg"] = input.region; }

        if (updates.length === 0) return { success: false, message: "No fields to update" };

        try {
            const response = await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { PK: `ORG#${orgId}`, SK: `BRANCH#${branchId}` },
                ConditionExpression: "attribute_exists(PK)",
                UpdateExpression: `SET ${updates.join(", ")}, last_updated = :t`,
                ExpressionAttributeNames: attrNames,
                ExpressionAttributeValues: attrValues,
                ReturnValues: "ALL_NEW"
            }));

            return {
                success: true,
                message: "Branch updated successfully",
                ...formatResponse(response.Attributes)
            };
        } catch (error) {
            if (error.name === "ConditionalCheckFailedException") {
                throw new Error("BRANCH_NOT_FOUND_OR_ACCESS_DENIED");
            }
            console.error("UpdateBranch Error:", error);
            throw error;
        }
    },

    saveBuilding: async (orgId, branchId, buildingId, input) => {
        const timestamp = new Date().toISOString();

        // El buildingId se limpia para asegurar que sea parte de la SK correctamente
        const bId = buildingId.toUpperCase().replace(/\s+/g, '-');

        const item = {
            PK: `ORG#${orgId}`,
            SK: `BRANCH#${branchId}#BLDG#${bId}`,
            entity_type: "BUILDING_CONFIG",

            // 1. Información General
            building_info: {
                name: input.name || "Nuevo Edificio",
                usage_type: input.usageType || "INDUSTRIAL",
                status: input.status || "OPERATIONAL",
                year_built: Number(input.yearBuilt) || null,
                manager_contact: input.managerContact || "N/A"
            },

            // 2. Especificaciones Físicas (Ingeniería Térmica)
            physical_specs: {
                m2_surface: Number(input.m2Surface) || 0,
                m3_volume: Number(input.m3Volume) || 0,
                max_occupancy: Number(input.maxOccupancy) || 0,
                roof_type: input.roofType || "STANDARD",
                insulation_u_value: Number(input.uValue) || 0 // Coeficiente de transmitancia
            },

            // 3. Configuración de Sistemas
            systems_config: {
                hvac_type: input.hvacType || "NONE",
                lighting_tech: input.lightingTech || "LED",
                bms_integrated: Boolean(input.hasBms) || false,
                backup_generation: Boolean(input.hasBackup) || false
            },

            // 4. Contexto de Ubicación
            location_context: {
                parent_branch: branchId,
                internal_zone_id: input.zoneId || "GENERAL",
                is_shared_facility: Boolean(input.isShared) || false
            },

            // 5. Clasificación y Negocio
            tags: {
                criticality: input.criticality || "MEDIUM",
                cost_center_primary: input.primaryCC || "N/A"
            },

            last_updated: timestamp,
            _internal_version: 1
        };

        try {
            await docClient.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: item
            }));

            return {
                success: true,
                buildingId: bId,
                ...formatResponse(item)
            };
        } catch (error) {
            console.error("Error saving Building Config:", error);
            return { success: false, error: error.message };
        }
    },

    updateBuilding: async (orgId, branchId, buildingId, input) => {
        const timestamp = new Date().toISOString();

        const updates = [];
        const attrValues = { ":t": timestamp };
        const attrNames = {
            "#bi": "building_info",
            "#ps": "physical_specs",
            "#sc": "systems_config",
            "#tags": "tags"
        };

        // --- 1. Información General ---
        if (input.name) { updates.push("#bi.#n = :n"); attrNames["#n"] = "name"; attrValues[":n"] = input.name; }
        if (input.usageType) { updates.push("#bi.usage_type = :ut"); attrValues[":ut"] = input.usageType; }
        if (input.status) { updates.push("#bi.status = :st"); attrValues[":st"] = input.status; }
        if (input.managerContact) { updates.push("#bi.manager_contact = :mc"); attrValues[":mc"] = input.managerContact; }

        // --- 2. Especificaciones Físicas (Ingeniería) ---
        if (input.m2Surface) { updates.push("#ps.m2_surface = :m2"); attrValues[":m2"] = Number(input.m2Surface); }
        if (input.m3Volume) { updates.push("#ps.m3_volume = :m3"); attrValues[":m3"] = Number(input.m3Volume); }
        if (input.uValue) { updates.push("#ps.insulation_u_value = :uv"); attrValues[":uv"] = Number(input.uValue); }

        // --- 3. Sistemas y Tecnología ---
        if (input.hvacType) { updates.push("#sc.hvac_type = :hv"); attrValues[":hv"] = input.hvacType; }
        if (input.hasBms !== undefined) { updates.push("#sc.bms_integrated = :bms"); attrValues[":bms"] = Boolean(input.hasBms); }

        // --- 4. Tags y Negocio ---
        if (input.criticality) { updates.push("#tags.criticality = :crit"); attrValues[":crit"] = input.criticality; }
        if (input.primaryCC) { updates.push("#tags.cost_center_primary = :pcc"); attrValues[":pcc"] = input.primaryCC; }

        if (updates.length === 0) return { success: false, message: "No fields to update" };

        try {
            const response = await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: {
                    PK: `ORG#${orgId}`,
                    SK: `BRANCH#${branchId}#BLDG#${buildingId.toUpperCase()}`
                },
                ConditionExpression: "attribute_exists(PK)",
                UpdateExpression: `SET ${updates.join(", ")}, last_updated = :t, _internal_version = _internal_version + :inc`,
                ExpressionAttributeNames: attrNames,
                ExpressionAttributeValues: { ...attrValues, ":inc": 1 },
                ReturnValues: "ALL_NEW"
            }));

            return {
                success: true,
                message: "Building updated successfully",
                ...formatResponse(response.Attributes)
            };
        } catch (error) {
            if (error.name === "ConditionalCheckFailedException") {
                throw new Error("BUILDING_NOT_FOUND");
            }
            console.error("UpdateBuilding Error:", error);
            throw error;
        }
    },

    saveCostCenter: async (orgId, input) => {
        const timestamp = new Date().toISOString();
        const ccId = input.id || `CC-${randomUUID().split('-')[0].toUpperCase()}`;

        const item = {
            PK: `ORG#${orgId}`,
            SK: `COST_CENTER#${ccId}`,
            entity_type: "COST_CENTER_CONFIG",

            // 1. Información de Identidad Contable
            cc_info: {
                name: input.name || "Nuevo Centro de Costos",
                accounting_code: input.accountingCode || "000-000",
                manager_id: input.managerId || "UNASSIGNED",
                parent_branch: input.branchId || "GLOBAL",
                status: "ACTIVE"
            },

            // 2. Reglas de Prorrateo (Cómo paga la energía)
            allocation_rules: {
                allocation_method: input.method || "FIXED_PCT",
                allocation_percentage: Number(input.percentage) || 0,
                operating_hours: Number(input.operatingHours) || 8,
                is_vat_exempt: Boolean(input.isVatExempt) || false
            },

            // 3. Control Presupuestario
            budget_config: {
                annual_budget_cap: Number(input.annualBudget) || 0,
                alert_thresholds: input.thresholds || [75, 90, 100],
                over_budget_policy: input.budgetPolicy || "NOTIFY"
            },

            // 4. Integración y Auditoría
            audit_trail: {
                created_at: timestamp,
                gl_account_mapping: input.glMapping || "EXP-GENERIC",
                last_audit_date: timestamp
            },

            last_updated: timestamp
        };

        try {
            await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
            return { success: true, ccId: ccId, ...formatResponse(item) };
        } catch (error) {
            console.error("Error saving Cost Center:", error);
            return { success: false, error: error.message };
        }
    },
    updateCostCenter: async (orgId, ccId, input) => {
        const timestamp = new Date().toISOString();
        const updates = [];
        const attrValues = { ":t": timestamp };
        const attrNames = { "#cc": "cc_info", "#ar": "allocation_rules", "#bc": "budget_config" };

        // Actualización de Información General
        if (input.name) { updates.push("#cc.#n = :n"); attrNames["#n"] = "name"; attrValues[":n"] = input.name; }
        if (input.status) { updates.push("#cc.status = :st"); attrValues[":st"] = input.status; }

        // Actualización de Reglas Financieras
        if (input.percentage) { updates.push("#ar.allocation_percentage = :pct"); attrValues[":pct"] = Number(input.percentage); }
        if (input.method) { updates.push("#ar.allocation_method = :met"); attrValues[":met"] = input.method; }

        // Actualización de Presupuesto
        if (input.annualBudget) { updates.push("#bc.annual_budget_cap = :abc"); attrValues[":abc"] = Number(input.annualBudget); }

        if (updates.length === 0) return { success: false, message: "No fields to update" };

        try {
            const response = await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { PK: `ORG#${orgId}`, SK: `COST_CENTER#${ccId}` },
                ConditionExpression: "attribute_exists(PK)",
                UpdateExpression: `SET ${updates.join(", ")}, last_updated = :t`,
                ExpressionAttributeNames: attrNames,
                ExpressionAttributeValues: attrValues,
                ReturnValues: "ALL_NEW"
            }));

            return { success: true, ...formatResponse(response.Attributes) };
        } catch (error) {
            if (error.name === "ConditionalCheckFailedException") throw new Error("COST_CENTER_NOT_FOUND");
            throw error;
        }
    },

    saveAsset: async (orgId, assetId, input) => {
        const timestamp = new Date().toISOString();
        const aId = assetId.toUpperCase();

        const item = {
            PK: `ORG#${orgId}`,
            SK: `ASSET#${aId}`,
            entity_type: "ASSET_CONFIG",

            asset_info: {
                name: input.name || "Nuevo Activo",
                category: input.category || "GENERAL",
                status: input.status || "ACTIVE",
                criticality: input.criticality || "MEDIUM"
            },

            technical_specs: {
                nominal_power_kw: Number(input.nominalPower) || 0,
                efficiency_class: input.efficiencyClass || "IE1",
                power_factor_nominal: Number(input.powerFactor) || 0.85
            },

            connectivity: {
                primary_meter_id: input.meterId || "UNLINKED",
                iot_thing_name: input.iotName || null
            },

            assignment: {
                branch_id: input.branchId,
                building_id: input.buildingId,
                cost_center_id: input.costCenterId,
                geo_xyz: input.geoXyz || "0,0,0"
            },

            last_updated: timestamp
        };

        try {
            await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
            return { success: true, assetId: aId, ...formatResponse(item) };
        } catch (error) {
            console.error("Error saving Asset:", error);
            return { success: false, error: error.message };
        }
    },

    updateAsset: async (orgId, assetId, input) => {
        const timestamp = new Date().toISOString();

        const updates = [];
        const attrValues = { ":t": timestamp };
        const attrNames = {
            "#ai": "asset_info",
            "#ts": "technical_specs",
            "#conn": "connectivity",
            "#asm": "assignment"
        };

        // --- 1. Información de Estado y Operación ---
        if (input.name) { updates.push("#ai.#n = :n"); attrNames["#n"] = "name"; attrValues[":n"] = input.name; }
        if (input.status) { updates.push("#ai.status = :st"); attrValues[":st"] = input.status; }
        if (input.criticality) { updates.push("#ai.criticality = :crit"); attrValues[":crit"] = input.criticality; }

        // --- 2. Especificaciones Técnicas (Normalmente tras un retrofit) ---
        if (input.nominalPower) { updates.push("#ts.nominal_power_kw = :np"); attrValues[":np"] = Number(input.nominalPower); }
        if (input.powerFactor) { updates.push("#ts.power_factor_nominal = :pf"); attrValues[":pf"] = Number(input.powerFactor); }

        // --- 3. Conectividad e IoT (Re-link de medidores) ---
        if (input.meterId) { updates.push("#conn.primary_meter_id = :mid"); attrValues[":mid"] = input.meterId; }
        if (input.iotName) { updates.push("#conn.iot_thing_name = :iot"); attrValues[":iot"] = input.iotName; }

        // --- 4. Re-asignación Física y Contable ---
        if (input.costCenterId) { updates.push("#asm.cost_center_id = :ccid"); attrValues[":ccid"] = input.costCenterId; }
        if (input.buildingId) { updates.push("#asm.building_id = :bid"); attrValues[":bid"] = input.buildingId; }

        if (updates.length === 0) return { success: false, message: "No fields to update" };

        try {
            const response = await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: {
                    PK: `ORG#${orgId}`,
                    SK: `ASSET#${assetId.toUpperCase()}`
                },
                ConditionExpression: "attribute_exists(PK)",
                UpdateExpression: `SET ${updates.join(", ")}, last_updated = :t`,
                ExpressionAttributeNames: attrNames,
                ExpressionAttributeValues: attrValues,
                ReturnValues: "ALL_NEW"
            }));

            return {
                success: true,
                message: "Asset updated successfully",
                ...formatResponse(response.Attributes)
            };
        } catch (error) {
            if (error.name === "ConditionalCheckFailedException") {
                throw new Error("ASSET_NOT_FOUND");
            }
            console.error("UpdateAsset Error:", error);
            throw error;
        }
    },

    saveTariff: async (orgId, branchId, serviceType, input) => {
        // Fail-fast: Si no hay branch o service, el SK será inválido
        if (!branchId || !serviceType) {
            return { success: false, error: "MISSING_MANDATORY_KEYS: branchId and serviceType are required." };
        }

        const timestamp = new Date().toISOString();
        const service = serviceType.toUpperCase();
        const bId = branchId.toUpperCase();

        const validFrom = input.validFrom || timestamp;
        const skDate = validFrom.split('T')[0];

        const item = {
            PK: `ORG#${orgId}`,
            // SK Único: permite múltiples tarifas históricas por sede y servicio
            SK: `TARIFF#${bId}#${service}#${skDate}`,
            GSI1_PK: `BRANCH#${bId}`,
            GSI1_SK: `TARIFF#${service}`,

            entity_type: "UTILITY_CONFIG",

            provider_info: {
                name: input.providerName || "IEC",
                service_type: service,
                contract_id: input.contractId || "N/A",
                account_number: input.accountNumber || "N/A",
            },

            tariff_structure: {
                billing_cycle: input.billingCycle || "MONTHLY",
                currency: input.currency || "ILS",
                pricing_model: input.pricingModel || "TIME_OF_USE",
                rates: {
                    base_unit_rate: Number(input.baseRate) || 0,
                    peak_rate: Number(input.peakRate) || 0,
                    off_peak_rate: Number(input.offPeakRate) || 0,
                    fixed_fee: Number(input.fixedFee) || 0,
                    reactive_penalty_rate: Number(input.reactivePenalty) || 0
                },
                taxes: (input.taxes || []).map(t => ({
                    name: t.name,
                    value: Number(t.value) || 0,
                    is_percentage: t.isPercentage ?? true
                }))
            },

            technical_constraints: {
                contracted_power_kw: Number(input.contractedPower) || 0,
                voltage_level: input.voltageLevel || "LOW_VOLTAGE",
                associated_meter_id: input.meterId ? `METER#${input.meterId.toUpperCase()}` : "ALL"
            },

            validity: {
                from: validFrom,
                to: input.validTo || "2099-12-31T23:59:59Z",
                is_active: true
            },

            metadata: {
                updated_at: timestamp,
                updated_by: input.userId || "system",
                version: "2.0"
            }
        };

        try {
            await docClient.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: item,
                // Opcional: Impedir duplicados exactos en el mismo día
                ConditionExpression: "attribute_not_exists(SK)"
            }));

            return {
                success: true,
                orgId: orgId,
                branchId: bId,
                tariffId: item.SK, // El campo específico que agregamos
                assetId: item.SK,  // Lo mantenemos por si algún componente genérico lo usa
                service: service,     // "ELECTRICITY"
                entity: JSON.stringify(item),
                ...formatResponse(item)
            };
        } catch (error) {
            if (error.name === "ConditionalCheckFailedException") {
                return { success: false, error: "TARIFF_ALREADY_EXISTS_FOR_THIS_DATE" };
            }
            console.error("[DB ERROR] saveTariff:", error);
            return { success: false, error: error.message };
        }
    },

    updateTariff: async (orgId, branchId, serviceType, input) => {
        const timestamp = new Date().toISOString();
        const service = serviceType.toUpperCase();
        const bId = branchId.toUpperCase();

        // Si usas el versionado por fecha, el SK debe venir en el input. 
        // Si no, usamos el SK estándar por defecto.
        const targetSK = input.sk || `TARIFF#${bId}#${service}`;

        const updates = [];
        const attrValues = { ":t": timestamp };
        const attrNames = {
            "#ts": "tariff_structure",
            "#r": "rates",
            "#tc": "technical_constraints",
            "#v": "validity"
        };

        // Actualización Granular de Precios (Evita pisar todo el mapa 'rates')
        if (input.baseRate !== undefined) {
            updates.push("#ts.#r.base_unit_rate = :br");
            attrValues[":br"] = Number(input.baseRate);
        }
        if (input.peakRate !== undefined) {
            updates.push("#ts.#r.peak_rate = :pr");
            attrValues[":pr"] = Number(input.peakRate);
        }
        if (input.offPeakRate !== undefined) {
            updates.push("#ts.#r.off_peak_rate = :opr");
            attrValues[":opr"] = Number(input.offPeakRate);
        }

        // Actualización de Potencia Contratada
        if (input.contractedPower !== undefined) {
            updates.push("#tc.contracted_power_kw = :cp");
            attrValues[":cp"] = Number(input.contractedPower);
        }

        // Gestión de Vigencia (Cierre de tarifa)
        if (input.validTo) {
            updates.push("#v.#to = :vto");
            attrNames["#to"] = "to"; // "to" es reservada en DynamoDB
            attrValues[":vto"] = input.validTo;
        }

        if (updates.length === 0) return { success: false, message: "No fields to update" };

        try {
            const response = await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: {
                    PK: `ORG#${orgId}`,
                    SK: targetSK
                },
                ConditionExpression: "attribute_exists(PK)", // Solo actualiza si existe
                UpdateExpression: `SET ${updates.join(", ")}, last_updated = :t`,
                ExpressionAttributeNames: attrNames,
                ExpressionAttributeValues: attrValues,
                ReturnValues: "ALL_NEW"
            }));

            return { success: true, ...formatResponse(response.Attributes) };
        } catch (error) {
            if (error.name === "ConditionalCheckFailedException") {
                return { success: false, error: "TARIFF_NOT_FOUND" };
            }
            console.error("[DB ERROR] updateTariff:", error);
            throw error;
        }
    },


    saveAlertRule: async (orgId, branchId, entityId, alertType, input) => {
        const timestamp = new Date().toISOString();
        // SK compuesta para búsquedas granulares: Sucursal -> Entidad -> Tipo
        const sk = `ALERT#${branchId}#ENTITY#${entityId}#TYPE#${alertType.toUpperCase()}`;

        const item = {
            PK: `ORG#${orgId}`,
            SK: sk,
            entity_type: "ALERT_CONFIG",

            // 1. Identidad de la Regla
            rule_identity: {
                name: input.name || "Nueva Alerta",
                description: input.description || "Sin descripción",
                status: input.status || "ENABLED",
                priority: input.priority || "P2_HIGH"
            },

            // 2. Lógica de Disparo (Engine Logic)
            logic_conditions: {
                target_id: entityId,
                metric_source: input.metricSource || "active_power_kw",
                operator: input.operator || "GREATER_THAN",
                threshold: Number(input.threshold) || 0,
                duration_minutes: Number(input.durationMins) || 5,
                hysteresis_pct: Number(input.hysteresis) || 0
            },

            // 3. Estrategia de Notificación y Escalado
            notification_strategy: {
                channels: input.channels || ["EMAIL"],
                recipients: input.recipients || [],
                escalation_policy: input.escalationPolicy || "DEFAULT",
                suppression_window_mins: Number(input.suppressionMins) || 60
            },

            // 4. Automatización y Respuesta
            automation_hooks: {
                auto_incident_create: Boolean(input.autoIncident) || false,
                remediation_suggestion: input.remediation || "Revisar activo manualmente."
            },

            last_updated: timestamp
        };

        try {
            await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
            return { success: true, alertKey: sk, ...formatResponse(item) };
        } catch (error) {
            console.error("Error saving Alert Rule:", error);
            return { success: false, error: error.message };
        }
    },
    updateAlertRule: async (orgId, branchId, entityId, alertType, input) => {
        const timestamp = new Date().toISOString();
        const sk = `ALERT#${branchId}#ENTITY#${entityId}#TYPE#${alertType.toUpperCase()}`;

        const updates = [];
        const attrValues = { ":t": timestamp };
        const attrNames = { "#ri": "rule_identity", "#lc": "logic_conditions" };

        // Actualización de Umbrales y Lógica
        if (input.threshold) { updates.push("#lc.threshold = :th"); attrValues[":th"] = Number(input.threshold); }
        if (input.durationMins) { updates.push("#lc.duration_minutes = :dm"); attrValues[":dm"] = Number(input.durationMins); }
        if (input.status) { updates.push("#ri.#st = :s"); attrNames["#st"] = "status"; attrValues[":s"] = input.status; }

        if (updates.length === 0) return { success: false, message: "No fields to update" };

        try {
            const response = await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { PK: `ORG#${orgId}`, SK: sk },
                ConditionExpression: "attribute_exists(PK)",
                UpdateExpression: `SET ${updates.join(", ")}, last_updated = :t`,
                ExpressionAttributeNames: attrNames,
                ExpressionAttributeValues: attrValues,
                ReturnValues: "ALL_NEW"
            }));

            return { success: true, ...formatResponse(response.Attributes) };
        } catch (error) {
            if (error.name === "ConditionalCheckFailedException") throw new Error("ALERT_RULE_NOT_FOUND");
            throw error;
        }
    },

    saveUser: async (orgId, userId, input) => {
        const timestamp = new Date().toISOString();
        // Sanitización de ID para evitar caracteres extraños en el SK
        const uId = userId.toLowerCase().trim().replace(/\s+/g, '_');

        const item = {
            PK: `ORG#${orgId}`,
            SK: `USER#${uId}`,

            // GSI para buscar usuarios por rol dentro de una organización
            GSI1_PK: `ORG#${orgId}#ROLE#${input.role || "VIEWER"}`,
            GSI1_SK: `USER#${input.fullName || uId}`,

            entity_type: "USER_CONFIG",
            version: "1.0",

            // Profile: Datos de identidad pública
            profile: {
                full_name: input.fullName || "Nuevo Usuario",
                email: input.email,
                job_title: input.position || "Staff",
                external_id: input.cognitoSub || null, // Vínculo con Cognito
                timezone: input.timezone || "UTC"
            },

            // Auth Context: El núcleo del RBAC
            auth_context: {
                role: input.role || "VIEWER",
                scope_type: input.scopeType || "BRANCH",
                scope_id: input.accessScope || `ORG#${orgId}`,
                permissions: input.permissions || ["reports:view"],
                mfa_enabled: false
            },

            // UX Preferences: Configuración de interfaz
            ux_preferences: {
                default_view: input.defaultDashboard || "OVERVIEW",
                locale: input.language || "es-IL",
                notifications: {
                    email: input.emailAlerts ?? true,
                    push: true,
                    sms_critical: input.smsAlerts ?? false
                }
            },

            // Metadata de Sistema
            system_metadata: {
                account_status: "ACTIVE",
                created_at: timestamp,
                updated_at: timestamp,
                last_login: null,
                updated_by: input.adminUserId || "SYSTEM"
            }
        };

        try {
            await docClient.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: item
            }));

            return {
                success: true,
                userId: uId,
                orgId: orgId,
                ...formatResponse(item)
            };
        } catch (error) {
            console.error("[DB ERROR] saveUser:", error);
            return { success: false, error: error.message };
        }
    },

    updateUser: async (orgId, userId, input) => {
        const timestamp = new Date().toISOString();
        const updates = [];
        const attrValues = { ":t": timestamp };
        const attrNames = { "#sys": "system_metadata" };

        // Mapeo dinámico para mantener el UpdateExpression limpio
        if (input.fullName) {
            updates.push("profile.full_name = :fn");
            attrValues[":fn"] = input.fullName;
        }
        if (input.role) {
            updates.push("auth_context.#r = :role");
            attrNames["#r"] = "role";
            attrValues[":role"] = input.role;
            // Nota: Si cambia el rol, idealmente deberías actualizar también el GSI1_PK
        }
        if (input.emailAlerts !== undefined) {
            updates.push("ux_preferences.notifications.email = :ea");
            attrValues[":ea"] = input.emailAlerts;
        }

        if (updates.length === 0) return { success: false, message: "No fields to update" };

        try {
            const response = await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: {
                    PK: `ORG#${orgId}`,
                    SK: `USER#${userId.toLowerCase()}`
                },
                ConditionExpression: "attribute_exists(PK)",
                UpdateExpression: `SET ${updates.join(", ")}, #sys.updated_at = :t`,
                ExpressionAttributeNames: attrNames,
                ExpressionAttributeValues: attrValues,
                ReturnValues: "ALL_NEW"
            }));

            const updated = response.Attributes;
            return {
                success: true,
                userId: userId,
                ...formatResponse(updated)
            };
        } catch (error) {
            if (error.name === "ConditionalCheckFailedException") {
                return { success: false, error: "USER_NOT_FOUND" };
            }
            console.error("[DB ERROR] updateUser:", error);
            return { success: false, error: error.message };
        }
    },

    saveProductionLog: async (orgId, branchId, period, input = {}) => {
        const timestamp = new Date().toISOString();
        // Normalización: Aseguramos que el periodo sea consistente (ej: 2026-04)
        const formattedPeriod = period.trim().toUpperCase();
        const bId = branchId.toUpperCase();
        const logKey = `PROD#${formattedPeriod}#${bId}`;

        const item = {
            PK: `ORG#${orgId}`,
            SK: logKey,

            // GSI para obtener producción de todas las sedes en un mismo mes
            GSI1_PK: `ORG#${orgId}#PERIOD#${formattedPeriod}`,
            GSI1_SK: `BRANCH#${bId}`,

            entity_type: "PRODUCTION_LOG",
            version: "2.0",

            // Métricas de Producción (Core para KPIs)
            metrics: {
                units_produced: Number(input.units) || 0,
                unit_type: input.unitType || "TONS",
                efficiency_ratio: Number(input.efficiency) || 1.0,
                waste_generated: Number(input.waste) || 0,
                downtime_hours: Number(input.downtime) || 0,
                active_lines: Number(input.activeLines) || 1
            },

            // Contexto Operativo (Clave para IA y normalización por clima)
            operational_context: {
                shift_mode: input.shiftMode || "24/7",
                avg_temperature: Number(input.temperature) || 25.0,
                avg_humidity: Number(input.humidity) || 50,
                raw_material_batch: input.rawMaterialBatch || "N/A",
                active_m2: Number(input.activeM2) || 0
            },

            // Trazabilidad
            metadata: {
                branch_id: bId,
                period: formattedPeriod,
                created_at: timestamp,
                updated_at: timestamp,
                updated_by: input.userId || "SYSTEM"
            }
        };

        try {
            await docClient.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: item
            }));

            return {
                success: true,
                logKey: logKey,
                orgId,
                branchId: bId,
                ...formatResponse(item)
            };
        } catch (error) {
            console.error("[DB ERROR] saveProductionLog:", error);
            return { success: false, error: error.message };
        }
    },

    updateProductionLog: async (orgId, period, branchId, input = {}) => {
        const timestamp = new Date().toISOString();
        const formattedPeriod = period.trim().toUpperCase();
        const bId = branchId.toUpperCase();
        const logKey = `PROD#${formattedPeriod}#${bId}`;

        const updates = [];
        const attrValues = { ":t": timestamp };
        const attrNames = { "#m": "metrics", "#oc": "operational_context", "#meta": "metadata" };

        // Mapeo dinámico y seguro de campos
        if (input.units !== undefined) {
            updates.push("#m.units_produced = :u");
            attrValues[":u"] = Number(input.units);
        }
        if (input.efficiency !== undefined) {
            updates.push("#m.efficiency_ratio = :e");
            attrValues[":e"] = Number(input.efficiency);
        }
        if (input.temperature !== undefined) {
            updates.push("#oc.avg_temperature = :temp");
            attrValues[":temp"] = Number(input.temperature);
        }
        if (input.rawMaterialBatch) {
            updates.push("#oc.raw_material_batch = :batch");
            attrValues[":batch"] = input.rawMaterialBatch;
        }

        if (updates.length === 0) return { success: false, message: "No fields to update" };

        try {
            const response = await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { PK: `ORG#${orgId}`, SK: logKey },
                ConditionExpression: "attribute_exists(PK)",
                UpdateExpression: `SET ${updates.join(", ")}, #meta.updated_at = :t`,
                ExpressionAttributeNames: attrNames,
                ExpressionAttributeValues: attrValues,
                ReturnValues: "ALL_NEW"
            }));

            return {
                success: true,
                logKey: logKey,
                ...formatResponse(response.Attributes)
            };
        } catch (error) {
            if (error.name === "ConditionalCheckFailedException") {
                return { success: false, error: "PRODUCTION_LOG_NOT_FOUND" };
            }
            console.error("[DB ERROR] updateProductionLog:", error);
            return { success: false, error: error.message };
        }
    },

    saveEmissionFactor: async (input) => {
        const timestamp = new Date().toISOString();

        // SK robusta: Si falta algo, ponemos un fallback para que no explote el String literal
        const sk = `YEAR#${input.year}#REGION#${input.regionCode}#SOURCE#${(input.source || 'MANUAL').toUpperCase()}#${(input.activityType || 'ELEC').toUpperCase()}`;

        const item = {
            PK: "GLOBAL#FACTORS",
            SK: sk,
            entity_type: "EMISSION_FACTOR",

            factor_identity: {
                name: input.name || "Grid Factor",
                year: Number(input.year) || 2026,
                region: input.regionName || input.regionCode || "Global",
                activity_id: input.activityId || sk,
                source: input.source || "Climatiq" // Valor por defecto si falta
            },

            carbon_data: {
                co2e_unit: input.unit || "kg/kWh",
                co2e_value: Number(input.value) || 0,
                constituents: {
                    co2: Number(input.co2 ?? input.value ?? 0), // Fallback en cadena
                    ch4: Number(input.ch4 ?? 0),
                    n2o: Number(input.n2o ?? 0)
                }
            },

            classification: {
                scope: input.scope || "SCOPE_2",
                category: input.category || "ENERGY_INDIRECT",
                methodology: input.methodology || "LOCATION_BASED",
                uncertainty_pct: Number(input.uncertainty ?? 0)
            },

            lifecycle: {
                valid_from: input.validFrom || `${input.year}-01-01`,
                valid_to: input.validTo || `${input.year}-12-31`,
                is_latest: input.isLatest ?? true // nullish coalescing para booleanos
            },

            last_updated: timestamp
        };

        // DEBUG: Antes de enviar, mira si hay algún undefined
        // console.log("ITEM TO SAVE:", JSON.stringify(item));

        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
        return { success: true, factorKey: sk };
    },

    updateEmissionFactor: async (year, regionCode, source, activityType, input) => {
        const timestamp = new Date().toISOString();
        const sk = `YEAR#${year}#REGION#${regionCode}#SOURCE#${source.toUpperCase()}#${activityType.toUpperCase()}`;

        const updates = [];
        const attrValues = { ":t": timestamp };
        const attrNames = { "#cd": "carbon_data", "#cl": "classification" };

        if (input.value) { updates.push("#cd.co2e_value = :v"); attrValues[":v"] = Number(input.value); }
        if (input.uncertainty) { updates.push("#cl.uncertainty_pct = :u"); attrValues[":u"] = Number(input.uncertainty); }
        if (input.isLatest !== undefined) { updates.push("lifecycle.is_latest = :il"); attrValues[":il"] = Boolean(input.isLatest); }

        if (updates.length === 0) return { success: false, message: "No fields to update" };

        try {
            const response = await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { PK: "GLOBAL#FACTORS", SK: sk },
                ConditionExpression: "attribute_exists(PK)",
                UpdateExpression: `SET ${updates.join(", ")}, last_updated = :t`,
                ExpressionAttributeNames: attrNames,
                ExpressionAttributeValues: attrValues,
                ReturnValues: "ALL_NEW"
            }));

            return { success: true, ...formatResponse(response.Attributes) };
        } catch (error) {
            if (error.name === "ConditionalCheckFailedException") throw new Error("FACTOR_NOT_FOUND");
            throw error;
        }
    },

    saveMeter: async (orgId, branchId, meterId, input) => {
        const timestamp = new Date().toISOString();
        const mId = meterId.toUpperCase();
        const bId = branchId.toUpperCase();

        const item = {
            PK: `ORG#${orgId}`,
            SK: `METER#${mId}`,
            // GSI para buscar todos los medidores de una planta específica
            GSI1_PK: `BRANCH#${bId}`,
            GSI1_SK: `TYPE#${(input.type || 'ELECTRICITY').toUpperCase()}#${mId}`,

            entity_type: "METER_CONFIG",

            meter_info: {
                name: input.name || "Nuevo Medidor",
                serial_number: input.serialNumber,
                manufacturer: input.manufacturer || "Schneider Electric",
                model: input.model || "iEM3000",
                firmware_version: input.firmware || "1.0.0"
            },

            metrology: {
                unit: input.unit || "kWh",
                scaling_factor: Number(input.scalingFactor) || 1.0,
                ct_ratio: input.ctRatio || "1:1", // Importante para auditoría
                accuracy_class: input.accuracyClass || "1.0",
                is_fiscal: Boolean(input.isMain) || false
            },

            topology: {
                parent_meter_id: input.parentMeterId ? `METER#${input.parentMeterId.toUpperCase()}` : null,
                role: input.isMain ? "MAIN_REVENUE" : "SUB_METER",
                building_id: input.buildingId || "UNASSIGNED",
                cost_center_id: input.costCenterId || "GENERAL"
            },

            connectivity: {
                iot_thing_name: input.iotName || `MTR_${mId}`,
                protocol: input.protocol || "MQTT",
                sampling_rate_sec: Number(input.samplingRate) || 900,
                connection_status: "PROVISIONED"
            },

            assignment: {
                branch_id: bId,
                physical_location: input.location || "Tablero General"
            },

            last_updated: timestamp
        };

        try {
            await docClient.send(new PutCommand({
                TableName: TABLE_NAME,
                Item: item,
                // Protección contra sobreescritura accidental
                ConditionExpression: "attribute_not_exists(SK)"
            }));
            return { success: true, meterId: mId };
        } catch (error) {
            if (error.name === "ConditionalCheckFailedException") {
                return { success: false, message: "Meter ID already exists" };
            }
            console.error("[DB ERROR] saveMeter:", error);
            throw error;
        }
    },
    updateMeter: async (orgId, meterId, input) => {
        const timestamp = new Date().toISOString();
        const mId = meterId.toUpperCase();

        let updateExp = "SET last_updated = :t";
        const attrValues = { ":t": timestamp };
        const attrNames = { "#met": "metrology", "#top": "topology", "#conn": "connectivity" };

        // Actualización de escalado (cuando cambian el hardware en planta)
        if (input.scalingFactor) {
            updateExp += ", #met.scaling_factor = :sf";
            attrValues[":sf"] = Number(input.scalingFactor);
        }

        // Cambio de ubicación jerárquica
        if (input.parentMeterId !== undefined) {
            updateExp += ", #top.parent_meter_id = :pm";
            attrValues[":pm"] = input.parentMeterId ? `METER#${input.parentMeterId.toUpperCase()}` : null;
        }

        // Cambio de estado operativo
        if (input.status) {
            updateExp += ", #conn.connection_status = :stat";
            attrValues[":stat"] = input.status;
        }

        try {
            const response = await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { PK: `ORG#${orgId}`, SK: `METER#${mId}` },
                ConditionExpression: "attribute_exists(PK)",
                UpdateExpression: updateExp,
                ExpressionAttributeNames: attrNames,
                ExpressionAttributeValues: attrValues,
                ReturnValues: "ALL_NEW"
            }));

            return { success: true, entity: response.Attributes };
        } catch (error) {
            if (error.name === "ConditionalCheckFailedException") throw new Error("METER_NOT_FOUND");
            throw error;
        }
    },


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
            TableName: TABLE_NAME,
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

    processInvoiceIA: async (orgId, fileName) {
        const key = fileName || "unknown_key";
        console.log(`\n--- ⚙️ STARTING AI PIPELINE [ORG: ${orgId}] [FILE: ${key}] ---`);

        try {
            // 1. OBTENCIÓN DEL TEXTO (RAW CAPTURE)
            // Aquí deberías obtener el texto del PDF. 
            // Si ya tienes una función que hace el OCR con Textract, úsala.
            // const rawText = await s3Service.getOCRText(fileName);
            
            // Simulación de la estructura que esperaba tu código original:
            const rawText = "Contenido extraído del PDF via Textract..."; 

            if (!rawText) {
                throw new Error("No se pudo extraer texto del documento.");
            }

            // 2. CLASIFICACIÓN DE CONTEXTO
            const detectedCategory = await identifyCategory(rawText);
            console.log(`[PIPELINE] 1. Contexto: Cat detectada "${detectedCategory}"`);

            // 3. ANÁLISIS INTELIGENTE (Bedrock)
            console.log(`[PIPELINE] 2. Llamando a Bedrock para análisis...`);
            const aiAnalysis = await analyzeInvoice(rawText, detectedCategory);

            const aiCat = aiAnalysis?.category || 'N/A';
            const aiConf = (aiAnalysis?.confidence_score || 0).toFixed(2);
            console.log(`[PIPELINE] 2. IA: Procesado como ${aiCat} (Confianza: ${aiConf})`);

            // 4. MOTOR DE EMISIONES (Climatiq)
            console.log(`[PIPELINE] 3. Calculando huella con Climatiq...`);
            const emissionLines = (aiAnalysis.emission_lines || []).map(line => ({
                ...line,
                category: line.category || aiAnalysis.category || "ELEC"
            }));

            const country = aiAnalysis.extracted_data?.location?.country || "ES";
            const emissionCalculations = await calculateFootprint(emissionLines, country);

            console.log(`[PIPELINE] 3. Cálculo: ${emissionCalculations.total_kg.toFixed(2)} kgCO2e`);

            // 5. MAPEADO (Golden Record)
            // Ajustamos el mapeo para que coincida con tu estructura de DynamoDB
            const goldenRecord = buildGoldenRecord(
                `ORG#${orgId}`,
                key,
                aiAnalysis,
                emissionCalculations,
                "VALIDATED",
                detectedCategory,
                { source: 'web_upload', uploadedAt: new Date().toISOString() }
            );

            // 6. PERSISTENCIA
            console.log(`\n--- 📊 DATA CHECK [${goldenRecord.SK}] ---`);
            console.log(`   🌍 CO2:      ${goldenRecord.climatiq_result?.co2e || 0} kg`);
            console.log(`   💰 Spend:    ${goldenRecord.extracted_data?.total_amount || 0}`);
            console.log(`------------------------------------------`);

            await persistTransaction(goldenRecord);
            console.log(`[PIPELINE] 5. Éxito: Registro guardado en DB.`);

            // Devolvemos el objeto que el Frontend necesita para el Step 2 (Validation)
            return {
                vendor: goldenRecord.extracted_data?.vendor || 'Unknown',
                total: goldenRecord.extracted_data?.total_amount || 0,
                date: goldenRecord.extracted_data?.date || '',
                consumption: goldenRecord.extracted_data?.consumption || 0,
                co2e: goldenRecord.climatiq_result?.co2e || 0,
                success: true
            };

        } catch (error) {
            console.error(`\n❌ [PIPELINE_ERROR]: Fallo en ${key}`);
            console.error(`Detalle: ${error.message}`);
            throw error; // Re-lanzar para que el handler lo capture
        }
    }


};