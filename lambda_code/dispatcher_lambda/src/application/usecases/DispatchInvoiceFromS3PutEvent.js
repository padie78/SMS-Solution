import {
  parseDispatcherEnqueueResult,
  safeParseS3DispatcherInvoke
} from "@sms/common";
import { ValidationError } from "../../domain/errors.js";
import { extractInvoiceMetadata } from "../../domain/extractInvoiceMetadata.js";
import { formatZodIssues } from "@sms/shared";

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
   * Entrada típica del handler S3; el caso de uso valida contra {@link import('@sms/common').S3DispatcherInvoke}.
   * @param {{ requestId: string, bucket?: string, rawKey?: string }} params
   * @returns {Promise<import('@sms/common').DispatcherEnqueueResult>}
   */
  async execute(params) {
    const parsedInvoke = safeParseS3DispatcherInvoke(params);
    if (!parsedInvoke.success) {
      throw new ValidationError(`${formatZodIssues(parsedInvoke.error)}`);
    }

    const { requestId, bucket, rawKey } = parsedInvoke.data;

    const { sk, key } = extractInvoiceMetadata(rawKey);
    const orgId = await this.deps.orgResolver.resolveOrgId({ bucket, key, requestId });

    await this.deps.invoiceRepository.putInvoiceSkeleton({ orgId, sk, bucket, key, requestId });
    await this.deps.invoiceQueue.enqueueInvoice({ bucket, key, orgId, sk, requestId });

    return parseDispatcherEnqueueResult({
      status: "ENQUEUED",
      invoiceId: sk,
      orgId,
      key
    });
  }
}

