/**
 * Bedrock / LLM orchestration for workers. Implement with `@aws-sdk/client-bedrock-runtime`.
 */
export interface BedrockInvokeInput {
  readonly modelId: string;
  readonly bodyJson: string;
}

export interface IBedrockAdapter {
  invokeModel(input: BedrockInvokeInput): Promise<string>;
}
