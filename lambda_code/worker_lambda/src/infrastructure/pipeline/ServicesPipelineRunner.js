import { invoicePipeline } from "../../application/usecases/invoicePipeline.js";

export class ServicesPipelineRunner {
  /**
   * @param {{ pipelineFn?: typeof invoicePipeline }} deps
   */
  constructor(deps = {}) {
    this.pipeline = deps.pipelineFn || invoicePipeline;
  }

  /**
   * @param {Record<string, unknown>} params
   */
  async run(params) {
    await this.pipeline(params);
  }
}

