import { pipeline } from "../../services/pipeline.js";

export class ServicesPipelineRunner {
  /**
   * @param {{ pipelineFn?: typeof pipeline }} deps
   */
  constructor(deps = {}) {
    this.pipeline = deps.pipelineFn || pipeline;
  }

  /**
   * @param {Record<string, unknown>} params
   */
  async run(params) {
    await this.pipeline(params);
  }
}

