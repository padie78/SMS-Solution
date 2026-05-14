/**
 * Outbound SQS sends (fan-out, ingestion triggers). Implement with `@aws-sdk/client-sqs`.
 */
export interface SqsSendMessageInput {
  readonly queueUrl: string;
  readonly body: string;
  readonly messageGroupId?: string;
  readonly messageDeduplicationId?: string;
}

export interface ISqsAdapter {
  sendMessage(input: SqsSendMessageInput): Promise<void>;
}
