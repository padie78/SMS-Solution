import { configService } from "./configService.js";

export class ConfigServiceAdapter {
  /**
   * @param {{ impl?: typeof configService }} deps
   */
  constructor(deps = {}) {
    this.impl = deps.impl || configService;
  }

  async saveOrgConfig(orgId, input) {
    return await this.impl.saveOrgConfig(orgId, input);
  }
  async saveUser(orgId, userId, input) {
    return await this.impl.saveUser(orgId, userId, input);
  }
  async createBranch(orgId, input) {
    return await this.impl.createBranch(orgId, input);
  }
  async saveBuilding(orgId, branchId, buildingId, input) {
    return await this.impl.saveBuilding(orgId, branchId, buildingId, input);
  }
  async saveMeter(orgId, branchId, meterId, input) {
    return await this.impl.saveMeter(orgId, branchId, meterId, input);
  }
  async saveAsset(orgId, assetId, input) {
    return await this.impl.saveAsset(orgId, assetId, input);
  }
  async saveCostCenter(orgId, input) {
    return await this.impl.saveCostCenter(orgId, input);
  }
  async saveTariff(orgId, branchId, serviceType, input) {
    return await this.impl.saveTariff(orgId, branchId, serviceType, input);
  }
  async saveAlertRule(orgId, branchId, entityId, alertType, input) {
    return await this.impl.saveAlertRule(orgId, branchId, entityId, alertType, input);
  }
  async confirmInvoice(orgId, sk, input) {
    return await this.impl.confirmInvoice(orgId, sk, input);
  }
  async processInvoiceIA(orgId, fileName, bucket) {
    return await this.impl.processInvoiceIA(orgId, fileName, bucket);
  }
  async saveEmissionFactor(input) {
    return await this.impl.saveEmissionFactor(input);
  }
  async saveProductionLog(orgId, branchId, period, input) {
    return await this.impl.saveProductionLog(orgId, branchId, period, input);
  }
}

