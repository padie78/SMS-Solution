import { parseInvoiceWorkerPipelineInput } from "@sms/common";
import { Logger, formatZodIssues } from "@sms/shared";
import { ZodError } from "zod";
import { extractSkFromS3Key } from "../../domain/extractSkFromS3Key.js";
import { ValidationError } from "../../domain/errors.js";

export class ProcessSqsBatch {
  /**
   * @param {{
   *  pipelineRunner: import("../ports/PipelineRunner.js").PipelineRunner,
   *  defaultOrgId: string
   * }} deps
   */
  constructor(deps) {
    this.deps = deps;
  }

  /** @param {{ event: { Records?: object[] }, context?: object }} params */
  async execute(params) {
    const event = params.event;
    const records = event?.Records || [];
    const totalRecords = records.length;

    Logger.info("Worker batch received", {
      records: totalRecords,
      source: "worker_lambda"
    });

    for (const record of records) {
      const messageId = record.messageId;

      try {
        let body;
        try {
          body = JSON.parse(record.body);
        } catch {
          Logger.warn("SQS body is not valid JSON", { messageId, source: "worker_lambda" });
          continue;
        }

        const pipelineInput = parseInvoiceWorkerPipelineInput(body, this.deps.defaultOrgId);

        let sk = pipelineInput.sk;
        if (!sk) {
          sk = extractSkFromS3Key(pipelineInput.key);
        }

        const pipelineParams = {
          ...pipelineInput,
          sk,
          orgId: pipelineInput.orgId
        };

        Logger.info("Starting invoice pipeline", {
          messageId,
          sk,
          orgId: pipelineParams.orgId,
          bucket: pipelineParams.bucket,
          source: "worker_lambda"
        });

        await this.deps.pipelineRunner.run(pipelineParams);

        Logger.info("Pipeline completed", { sk, messageId, source: "worker_lambda" });
      } catch (error) {
        const msg = error?.message ? String(error.message) : "Unknown error";

        if (error instanceof ZodError) {
          Logger.warn("Invalid invoice queue payload", {
            messageId,
            detail: formatZodIssues(error),
            source: "worker_lambda"
          });
          continue;
        }

        if (error instanceof ValidationError) {
          Logger.warn("Validation skip", { messageId, detail: msg, source: "worker_lambda" });
          continue;
        }

        Logger.error("Record processing failed", {
          messageId,
          err: msg,
          source: "worker_lambda"
        });
        throw error;
      }
    }

    Logger.info("Worker batch finished", { records: totalRecords, source: "worker_lambda" });
    return { status: "BATCH_PROCESSED" };
  }
}
