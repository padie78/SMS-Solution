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
    const { methodName, orgId, tenantId, holdingId } = params;
    const trustedTenant =
      tenantId || holdingId || orgId || params.orgId || "";
    const args = params.args || {};

    /** @type {string} PK tenant segment (trusted, never derived from GraphQL orgId alone) */
    const orgScope = trustedTenant;

    switch (methodName) {
      case "processInvoice": {
        const s3Key = args.fileName;
        if (!s3Key) {
          throw new ValidationError("Error: El nombre del archivo (fileName) no fue proporcionado.");
        }
        return await this.deps.configService.processInvoiceIA(
          orgScope,
          s3Key,
          this.deps.defaultBucket
        );
      }

      case "confirmInvoice":
        return await this.deps.configService.confirmInvoice(orgScope, args.sk, args.input);

      case "resolveInvoiceAssignment":
        return await this.deps.configService.resolveInvoiceAssignment(
          orgScope,
          args.input || {}
        );

      case "linkAssetExternalIdentifier":
        return await this.deps.configService.linkAssetExternalIdentifier(
          orgScope,
          args.assetId,
          args.input || {}
        );

      case "saveOrgConfig":
        return await this.deps.configService.saveOrgConfig(orgScope, args.input);

      case "saveUser":
        return await this.deps.configService.saveUser(orgScope, args.userId, args.input);

      case "createBranch":
        return await this.deps.configService.createBranch(orgScope, args.input || args);

      case "saveBuilding":
        return await this.deps.configService.saveBuilding(
          orgScope,
          args.branchId,
          args.buildingId,
          args.input
        );

      case "saveMeter":
        return await this.deps.configService.saveMeter(
          orgScope,
          args.branchId,
          args.meterId,
          args.input
        );

      case "saveAsset":
        return await this.deps.configService.saveAsset(orgScope, args.assetId, args.input);

      case "saveCostCenter":
        return await this.deps.configService.saveCostCenter(orgScope, args.input);

      case "saveTariff":
        return await this.deps.configService.saveTariff(
          orgScope,
          args.branchId,
          args.serviceType,
          args.input
        );

      case "saveAlertRule":
        return await this.deps.configService.saveAlertRule(
          orgScope,
          args.branchId,
          args.entityId,
          args.alertType,
          args.input
        );

      case "saveProductionLog":
        return await this.deps.configService.saveProductionLog(
          orgScope,
          args.branchId,
          args.period,
          args.input
        );

      case "saveEmissionFactor":
        return await this.deps.configService.saveEmissionFactor(args.input);

      default:
        throw new ValidationError(`Resolver handler for field "${methodName}" is not implemented.`);
    }
  }
}

