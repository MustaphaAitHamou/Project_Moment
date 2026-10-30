import nodemailer from 'nodemailer';
import type { Logger } from '../context';
import type { ServerEnv } from '../env';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface EmailAdapter {
  readonly enabled: boolean;
  readonly name: string;
  send(message: EmailMessage): Promise<{ delivered: boolean; reason?: string }>;
}

/** Aucun canal e-mail configuré : rien n'est envoyé (l'appelant en informe l'utilisateur). */
export class DisabledEmailAdapter implements EmailAdapter {
  readonly enabled = false;
  readonly name = 'disabled';
  async send(): Promise<{ delivered: boolean; reason?: string }> {
    return { delivered: false, reason: 'email_not_configured' };
  }
}

export class SmtpEmailAdapter implements EmailAdapter {
  readonly enabled = true;
  readonly name = 'smtp';
  private readonly transporter;

  constructor(
    private readonly options: { host: string; port: number; secure: boolean; user?: string; password?: string; from: string },
    private readonly logger: Logger,
  ) {
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      ...(options.user ? { auth: { user: options.user, pass: options.password ?? '' } } : {}),
    });
  }

  async send(message: EmailMessage) {
    await this.transporter.sendMail({ from: this.options.from, ...message });
    this.logger.info('email_sent', { to_domain: message.to.split('@')[1], subject: message.subject });
    return { delivered: true };
  }
}

/**
 * Garde-fou pour les environnements de test / prévisualisation : seules les adresses ou domaines
 * explicitement autorisés reçoivent des e-mails (jamais d'envoi de test à de vraies personnes).
 */
export class AllowlistEmailAdapter implements EmailAdapter {
  readonly enabled: boolean;
  readonly name: string;
  private readonly entries: string[];

  constructor(private readonly inner: EmailAdapter, allowlist: string) {
    this.entries = allowlist
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    this.enabled = inner.enabled;
    this.name = `${inner.name}+allowlist`;
  }

  isAllowed(address: string): boolean {
    const email = address.toLowerCase();
    const domain = email.split('@')[1] ?? '';
    return this.entries.some((entry) => (entry.includes('@') ? entry === email : entry === domain));
  }

  async send(message: EmailMessage) {
    if (!this.isAllowed(message.to)) return { delivered: false, reason: 'recipient_not_allowlisted' };
    return this.inner.send(message);
  }
}

export function createEmailAdapter(env: ServerEnv, logger: Logger): EmailAdapter {
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.EMAIL_FROM) return new DisabledEmailAdapter();
  const smtp = new SmtpEmailAdapter(
    {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      ...(env.SMTP_USER ? { user: env.SMTP_USER } : {}),
      ...(env.SMTP_PASSWORD ? { password: env.SMTP_PASSWORD } : {}),
      from: env.EMAIL_FROM,
    },
    logger,
  );
  return env.EMAIL_ALLOWLIST ? new AllowlistEmailAdapter(smtp, env.EMAIL_ALLOWLIST) : smtp;
}
