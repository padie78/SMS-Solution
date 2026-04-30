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

  /**
   * @param {{ event: any, context: any }} params
   */
  async execute(params) {
    const event = params.event;
    const records = event?.Records || [];
    const totalRecords = records.length;

    console.log(`[WORKER_START] Batch received. Records to process: ${totalRecords}`);

    for (const record of records) {
      const messageId = record.messageId;

      try {
        const body = JSON.parse(record.body);
        const bucket = body.bucket;
        const key = body.key;
        const orgId = body.orgId || this.deps.defaultOrgId;

        let sk = body.sk;

        console.log(`[WORKER_PROCESS] [${messageId}] Parsing message for S3 Key: ${key}`);

        if (!sk && key) {
          sk = extractSkFromS3Key(key);
          console.log(`[WORKER_DEBUG] [${messageId}] SK extracted from S3 Key: ${sk}`);
        }

        if (!sk) {
          console.warn(`[WORKER_SKIP] [${messageId}] Missing SK. Skipping record. Key: ${key}`);
          continue;
        }

        if (!sk.startsWith("INV#")) {
          console.warn(`[WORKER_SKIP] [${messageId}] Invalid SK format. Skipping record. SK: ${sk}`);
          continue;
        }

        console.log(`[WORKER_EVENT] [${sk}] Starting Pipeline | Org: ${orgId} | Bucket: ${bucket}`);

        const pipelineParams = {
          ...body,
          sk,
          orgId
        };

        await this.deps.pipelineRunner.run(pipelineParams);

        console.log(`[WORKER_SUCCESS] [${sk}] Workflow completed successfully.`);
      } catch (error) {
        const msg = error?.message ? String(error.message) : "Unknown error";
        if (error instanceof ValidationError) {
          console.warn(`[WORKER_SKIP] [${messageId}] ${msg}`);
          continue;
        }

        console.error(`[WORKER_FATAL_ERROR] [${messageId}] processing failed.`);
        console.error(`[ERROR_DETAILS]: ${msg}`);
        throw error;
      }
    }

    console.log(`[WORKER_FINISHED] All ${totalRecords} messages handled.`);
    return { status: "BATCH_PROCESSED" };
  }
}

