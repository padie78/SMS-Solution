/**
 * Port: Config/CRUD service (outbound dependency).
 *
 * @typedef {Object} ConfigService
 * @property {(orgId: string, input: any) => Promise<any>} saveOrgConfig
 * @property {(orgId: string, userId: string, input: any) => Promise<any>} saveUser
 * @property {(orgId: string, input: any) => Promise<any>} createBranch
 * @property {(orgId: string, branchId: string, buildingId: string, input: any) => Promise<any>} saveBuilding
 * @property {(orgId: string, branchId: string, meterId: string, input: any) => Promise<any>} saveMeter
 * @property {(orgId: string, assetId: string, input: any) => Promise<any>} saveAsset
 * @property {(orgId: string, input: any) => Promise<any>} saveCostCenter
 * @property {(orgId: string, branchId: string, serviceType: string, input: any) => Promise<any>} saveTariff
 * @property {(orgId: string, branchId: string, entityId: string, alertType: string, input: any) => Promise<any>} saveAlertRule
 * @property {(orgId: string, sk: string, input: any) => Promise<any>} confirmInvoice
 * @property {(orgId: string, fileName: string, bucket: string) => Promise<any>} processInvoiceIA
 * @property {(input: any) => Promise<any>} saveEmissionFactor
 * @property {(orgId: string, branchId: string, period: string, input: any) => Promise<any>} saveProductionLog
 */

export {};

