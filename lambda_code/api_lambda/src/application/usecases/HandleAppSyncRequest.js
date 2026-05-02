import { ValidationError } from "../../domain/errors.js";

export class HandleAppSyncRequest {
  /**
   * @param {{
   *  configService: import("../ports/ConfigService.js").ConfigService,
   *  defaultBucket: string,
   * }} deps
   */
  constructor(deps) {
    this.deps = deps;
  }

  /**
   * @param {{
   *  requestId: string,
   *  methodName: string,
   *  orgId: string,
   *  args: any
   * }} params
   */
  async execute(params) {
    const { methodName, orgId } = params;
    const args = params.args || {};

    switch (methodName) {
      case "processInvoice": {
        const s3Key = args.fileName;
        if (!s3Key) {
          throw new ValidationError("Error: El nombre del archivo (fileName) no fue proporcionado.");
        }
        return await this.deps.configService.processInvoiceIA(orgId, s3Key, this.deps.defaultBucket);
      }

      case "confirmInvoice":
        return await this.deps.configService.confirmInvoice(orgId, args.sk, args.input);

      case "resolveInvoiceAssignment":
        return await this.deps.configService.resolveInvoiceAssignment(orgId, args.input || {});

      case "linkAssetExternalIdentifier":
        return await this.deps.configService.linkAssetExternalIdentifier(orgId, args.assetId, args.input || {});

      case "saveOrgConfig":
        return await this.deps.configService.saveOrgConfig(orgId, args.input);

      case "saveUser":
        return await this.deps.configService.saveUser(orgId, args.userId, args.input);

      case "createBranch":
        return await this.deps.configService.createBranch(orgId, args.input || args);

      case "saveBuilding":
        return await this.deps.configService.saveBuilding(orgId, args.branchId, args.buildingId, args.input);

      case "saveMeter":
        return await this.deps.configService.saveMeter(orgId, args.branchId, args.meterId, args.input);

      case "saveAsset":
        return await this.deps.configService.saveAsset(orgId, args.assetId, args.input);

      case "saveCostCenter":
        return await this.deps.configService.saveCostCenter(orgId, args.input);

      case "saveTariff":
        return await this.deps.configService.saveTariff(orgId, args.branchId, args.serviceType, args.input);

      case "saveAlertRule":
        return await this.deps.configService.saveAlertRule(orgId, args.branchId, args.entityId, args.alertType, args.input);

      case "saveProductionLog":
        return await this.deps.configService.saveProductionLog(args.orgId || orgId, args.branchId, args.period, args.input);

      case "saveEmissionFactor":
        return await this.deps.configService.saveEmissionFactor(args.input);

      default:
        throw new ValidationError(`Resolver handler for field "${methodName}" is not implemented.`);
    }
  }
}

