export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface PasswordResetEmailData {
  to: string;
  userName?: string;
  resetUrl: string;
  expiresAtMinutes?: number;
}

export interface IEmailAdapter {
  readonly name: string;
  send(options: SendEmailOptions): Promise<boolean>;
  sendPasswordReset(data: PasswordResetEmailData): Promise<boolean>;
}
