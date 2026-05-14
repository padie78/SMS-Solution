/**
 * Transactional email (SES, SendGrid, etc.). Provide concrete `IEmailAdapter` in wiring.
 */
export interface EmailSendInput {
  readonly to: readonly string[];
  readonly subject: string;
  readonly htmlBody: string;
}

export interface IEmailAdapter {
  send(input: EmailSendInput): Promise<void>;
}
