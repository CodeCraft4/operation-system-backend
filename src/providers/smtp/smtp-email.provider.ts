import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

import {
  isUsableSecret,
  type IntegrationStatus,
} from '../../common/integration-status';
import type { Env } from '../../config/env';
import type {
  EmailProvider,
  EmailSendInput,
  EmailSendResult,
  EmailSmtpConfig,
  EmailTransport,
} from '../email-provider';
import { ProviderError } from '../provider-error';
import type { ProviderHealth } from '../provider.types';

@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  readonly kind = 'email' as const;
  readonly transport: EmailTransport = 'smtp';
  private readonly logger = new Logger(SmtpEmailProvider.name);
  private readonly smtp?: EmailSmtpConfig;
  private readonly transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService<Env, true>) {
    const host = this.config.get('SMTP_HOST', { infer: true });
    const user = this.config.get('SMTP_USER', { infer: true });
    const password = this.config.get('SMTP_PASSWORD', { infer: true });
    const from = this.config.get('SMTP_FROM', { infer: true });
    const port = this.config.get('SMTP_PORT', { infer: true }) ?? 587;
    const secure =
      this.config.get('SMTP_SECURE', { infer: true }) ?? port === 465;

    if (
      isUsableSecret(host) &&
      isUsableSecret(from) &&
      isUsableSecret(password)
    ) {
      this.smtp = {
        host: host!,
        port,
        secure,
        user,
        password,
        from: from!,
      };
      this.transporter = nodemailer.createTransport({
        host: this.smtp.host,
        port: this.smtp.port,
        secure: this.smtp.secure,
        requireTLS: !this.smtp.secure && this.smtp.port === 587,
        auth:
          this.smtp.user && this.smtp.password
            ? {
                user: this.smtp.user,
                pass: this.smtp.password,
              }
            : undefined,
      });
      this.logger.log('SMTP email client is configured.');
    } else {
      this.logger.log(
        'SMTP is idle. Add SMTP_HOST, SMTP_FROM, and SMTP_PASSWORD to connect.',
      );
    }
  }

  async check(): Promise<IntegrationStatus> {
    if (!this.transporter) {
      return 'skipped';
    }

    try {
      await this.transporter.verify();
      return 'ok';
    } catch {
      return 'error';
    }
  }

  async health(): Promise<ProviderHealth> {
    const checkedAt = new Date().toISOString();

    if (!this.transporter || !this.smtp) {
      return {
        provider: this.kind,
        status: 'skipped',
        checkedAt,
        message: 'SMTP is not configured.',
      };
    }

    try {
      await this.transporter.verify();
      return {
        provider: this.kind,
        status: 'ok',
        checkedAt,
        message: 'SMTP transport verified.',
      };
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: string }).code ?? '')
          : '';
      return {
        provider: this.kind,
        status: 'error',
        checkedAt,
        message: code
          ? `SMTP health check failed (${code}).`
          : 'SMTP health check failed.',
      };
    }
  }

  async send(input: EmailSendInput): Promise<EmailSendResult> {
    if (!this.transporter || !this.smtp) {
      throw ProviderError.notConfigured(this.kind);
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.smtp.from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
        replyTo: input.replyTo,
      });

      const accepted = Array.isArray(info.accepted)
        ? info.accepted.map(String)
        : [];

      return {
        messageId: info.messageId ?? '',
        accepted,
      };
    } catch (error) {
      throw new ProviderError({
        code: 'provider_error',
        provider: this.kind,
        message: 'SMTP send failed.',
        cause: error,
        statusHint: 502,
      });
    }
  }
}
