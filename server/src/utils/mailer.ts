import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Sends outbound mail, or logs it when no SMTP host is configured.
 *
 * A café setting this up locally, or evaluating it on a free host, has no mail
 * server. Rather than fail registration or pretend the mail went out, the
 * message is written to the server log so the verification link can be followed
 * from there. Production is configured by setting SMTP_HOST and friends.
 */
class Mailer {
  private transporter: Transporter | null = null;

  /**
   * Messages captured during a test run.
   *
   * The verification token only ever exists inside the email — the database
   * holds a hash — so a test that needs to follow a link has to read it from
   * the message. Only populated under NODE_ENV=test.
   */
  readonly outbox: MailMessage[] = [];

  /** True when real mail can actually be delivered. */
  get isConfigured(): boolean {
    return Boolean(config.mail.host);
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: config.mail.host,
        port: config.mail.port,
        secure: config.mail.secure,
        // A relay that accepts unauthenticated mail from this host needs no
        // credentials; passing empty strings would make the handshake fail.
        auth: config.mail.user
          ? { user: config.mail.user, pass: config.mail.password }
          : undefined,
      });
    }
    return this.transporter;
  }

  async send(message: MailMessage): Promise<void> {
    if (config.nodeEnv === 'test') {
      this.outbox.push(message);
      return;
    }

    if (!this.isConfigured) {
      // Deliberately not an error: the caller's flow should still succeed.
      console.info(
        [
          '',
          '─────────────────────────────────────────────────────────────',
          ' SMTP is not configured, so this email was not sent.',
          ' Set SMTP_HOST (and SMTP_USER / SMTP_PASSWORD) to deliver mail.',
          '─────────────────────────────────────────────────────────────',
          ` To:      ${message.to}`,
          ` Subject: ${message.subject}`,
          '',
          message.text,
          '─────────────────────────────────────────────────────────────',
          '',
        ].join('\n')
      );
      return;
    }

    await this.getTransporter().sendMail({
      from: config.mail.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}

export const mailer = new Mailer();
