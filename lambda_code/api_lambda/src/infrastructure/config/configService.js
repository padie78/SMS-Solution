/**
 * @fileoverview Service Layer - SMS (Sustainability Management System)
 * Lógica de negocio refinada y desacoplada de la infraestructura.
 */
import { configServiceAdapter as db } from "../infrastructure/adapters/configServiceAdapter.js";

// --- HELPERS DE NEGOCIO ---
const formatResponse = (item) => {
    if (!item) return null;
    return {
        ...item,
        id: item.SK,
        entity: JSON.stringify(item)
    };
};

export const configService = {

    // --- 1. ORGANIZACIÓN (Raíz de Configuración) ---
    saveOrgConfig: async (orgId, input) => {
        const item = {
            corporate_identity: {
                name: input.name || "SMS Global",
                tax_id: input.taxId,
                industry_sector: input.industrySector
            },
            system_internal_config: {
                default_currency: input.currency || "ILS",
                natural_gas_m3_to_kwh: Number(input.gasConversion) || 10.55,
                carbon_tax_shadow_price: Number(input.carbonShadowPrice) || 50.0
            },
            sustainability_standards: {
                baseline_year: Number(input.baselineYear) || 2024,
                reduction_target_pct: Number(input.reductionTarget) || 0.40
            },
            entity_type: "ORG_CONFIG"
        };

        const result = await db.saveNode(orgId, {
            id: "METADATA",
            nodeType: "ORG",
            name: input.name,
            metadata: item
        });

        return { success: true, ...formatResponse(result.item) };
    },

    // --- 2. GESTIÓN DE NODOS JERÁRQUICOS ---
    createNode: async (orgId, input) => {
        if (!input.nodeType) throw new Error("NODE_TYPE_REQUIRED");

        // Normalizamos los posibles IDs que puedan venir del frontend
        const cleanId = input.id || input.branchId || input.buildingId || input.meterId;

        const result = await db.saveNode(orgId, {
            id: cleanId,
            parentId: input.parentId || "ROOT",
            nodeType: input.nodeType,
            name: input.name,
            metadata: input.metadata || input 
        });

        return {
            success: true,
            ...formatResponse(result.item)
        };
    },

    // --- 3. UPDATES INTELIGENTES ---
    updateNode: async (orgId, sk, input) => {
        const updateResult = await db.updateNode(orgId, sk, input);
        
        if (!updateResult.success) {
            return { success: false, message: updateResult.message };
        }

        return {
            success: true,
            message: "Node updated successfully",
            ...formatResponse(updateResult.data)
        };
    },

    // --- 4. LÓGICA DE COST CENTERS ---
    saveCostCenter: async (orgId, input) => {
        const ccData = {
            cc_info: {
                accounting_code: input.accountingCode,
                status: input.status || "ACTIVE"
            },
            allocation_rules: {
                method: input.method || "SQUARE_METERS",
                percentage: Number(input.percentage) || 0
            }
        };

        return await configService.createNode(orgId, {
            id: input.id,
            nodeType: "COST_CENTER",
            name: input.name,
            metadata: ccData
        });
    },

    deleteNode: async (orgId, sk) => {
        const deleteResult = await db.deleteNode(orgId, sk);
        if (!deleteResult.success) {
            return { success: false, message: deleteResult.message };
        }
        return { success: true, message: "Node deleted successfully" };
    },

    // --- 5. QUERIES Y NAVEGACIÓN ---
    getInfrastructureTree: async (orgId, rootPath) => {
        const nodes = await db.listNodes(orgId, { underPath: rootPath });
        return nodes.map(n => formatResponse(n));
    }
};