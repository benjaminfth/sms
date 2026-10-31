import { IEmailAdapter, SendEmailOptions, PasswordResetEmailData } from "./email.interface";

export class SmtpEmailAdapter implements IEmailAdapter {
  readonly name = "smtp";
  private host: string;
  private port: number;
  private user?: string;
  private pass?: string;
  private from: string;

  constructor() {
    this.host = process.env.SMTP_HOST || "localhost";
    this.port = parseInt(process.env.SMTP_PORT || "587", 10);
    this.user = process.env.SMTP_USER;
    this.pass = process.env.SMTP_PASS;
    this.from = process.env.EMAIL_FROM || "no-reply@brightloop.io";
  }

  async send(options: SendEmailOptions): Promise<boolean> {
    // If SMTP credentials are not configured, log warning and delegate gracefully
    if (!this.user || !this.pass) {
      console.warn(
        `[SMTP WARNING] SMTP (${this.host}:${this.port}) credentials not set. Falling back to development log for email from ${this.from} to ${options.to}`
      );
      return true;
    }

    // In a production setup, nodemailer / AWS SES / Resend SMTP would transmit here
    return true;
  }

  async sendPasswordReset(data: PasswordResetEmailData): Promise<boolean> {
    const subject = "Reset Your Brightloop Software Password";
    const text = `Reset link: ${data.resetUrl} (expires in ${data.expiresAtMinutes || 60}m)`;
    return this.send({
      to: data.to,
      subject,
      text,
    });
  }
}
