import { ConfigError } from "../../domain/errors.js";
import { extractInvoiceMetadata } from "../../domain/extractInvoiceMetadata.js";

export class DispatchInvoiceFromS3PutEvent {
  /**
   * @param {{
   *  orgResolver: import("../ports/OrgResolver.js").OrgResolver,
   *  invoiceRepository: import("../ports/InvoiceRepository.js").InvoiceRepository,
   *  invoiceQueue: import("../ports/InvoiceQueue.js").InvoiceQueue,
   *  logger?: { info: Function, warn: Function, error: Function }
   * }} deps
   */
  constructor(deps) {
    this.deps = deps;
  }

  /**
   * @param {{
   *  requestId: string,
   *  bucket: string,
   *  rawKey: string
   * }} params
   */
  async execute(params) {
    const { requestId, bucket, rawKey } = params;

    if (!bucket) {
      throw new ConfigError(`Missing bucket in event. requestId=${requestId}`);
    }
    if (!rawKey) {
      throw new ConfigError(`Missing key in event. requestId=${requestId}`);
    }

    const { sk, key } = extractInvoiceMetadata(rawKey);
    const orgId = await this.deps.orgResolver.resolveOrgId({ bucket, key, requestId });

    await this.deps.invoiceRepository.putInvoiceSkeleton({ orgId, sk, bucket, key, requestId });
    await this.deps.invoiceQueue.enqueueInvoice({ bucket, key, orgId, sk, requestId });

    return { status: "ENQUEUED", invoiceId: sk, orgId, key };
  }
}

