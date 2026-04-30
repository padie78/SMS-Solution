import { buildSqsBatchHandler } from "./handlers/sqsBatchHandler.js";
import { ProcessSqsBatch } from "./application/usecases/ProcessSqsBatch.js";
import { ServicesPipelineRunner } from "./infrastructure/pipeline/ServicesPipelineRunner.js";

const pipelineRunner = new ServicesPipelineRunner();
const useCase = new ProcessSqsBatch({
  pipelineRunner,
  defaultOrgId: process.env.DEFAULT_ORG_ID || "DEFAULT_ORG"
});

export const handler = buildSqsBatchHandler({ useCase });