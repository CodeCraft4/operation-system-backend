import type { ProviderAdapter } from './provider-adapter';

/**
 * Frozen email transport choices for this backend.
 * SMTP is the baseline; Resend/SendGrid may wrap the same adapter later.
 */
export type EmailTransport = 'smtp';

export type EmailSmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  /** Never log or return this value. */
  password?: string;
  from: string;
};

export type EmailSendInput = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
};

export type EmailSendResult = {
  messageId: string;
  accepted: string[];
};

export interface EmailProvider extends ProviderAdapter {
  readonly transport: EmailTransport;
  send(input: EmailSendInput): Promise<EmailSendResult>;
}
