import nodemailer, { Transporter } from "nodemailer";
import { IEmailAdapter, SendEmailOptions, PasswordResetEmailData } from "./email.interface";
import { generatePasswordResetEmail } from "./templates/password-reset.template";

export class SmtpEmailAdapter implements IEmailAdapter {
  readonly name = "smtp";
  private transporter: Transporter | null = null;
  private host: string = "smtp.gmail.com";
  private port: number = 587;
  private user?: string;
  private pass?: string;
  private from: string = "no-reply@brightloop.io";

  constructor() {
    this.initTransporter();
  }

  private initTransporter(): Transporter | null {
    this.host = process.env.SMTP_HOST || "smtp.gmail.com";
    this.port = parseInt(process.env.SMTP_PORT || "587", 10);
    this.user = process.env.SMTP_USER;
    // Gmail app passwords often have spaces copied from Google Account; strip them for reliable SMTP auth
    this.pass = process.env.SMTP_PASS?.replace(/\s+/g, "");
    this.from = process.env.EMAIL_FROM || this.user || "no-reply@brightloop.io";

    if (this.user && this.pass) {
      this.transporter = nodemailer.createTransport({
        host: this.host,
        port: this.port,
        secure: this.port === 465,
        auth: {
          user: this.user,
          pass: this.pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
    }

    return this.transporter;
  }

  private getTransporter(): Transporter | null {
    if (!this.transporter || !this.user || !this.pass) {
      return this.initTransporter();
    }
    return this.transporter;
  }

  async send(options: SendEmailOptions): Promise<boolean> {
    const transporter = this.getTransporter();
    if (!transporter) {
      console.warn(
        `[SMTP WARNING] SMTP (${this.host}:${this.port}) credentials not configured (user: ${this.user || "missing"}, pass: ${this.pass ? "present" : "missing"}). Email to ${options.to} was not sent.`
      );
      return false;
    }

    try {
      console.log(`[SMTP] Transmitting email to ${options.to} (Subject: "${options.subject}")...`);
      const info = await transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      console.log(`[SMTP SUCCESS] Transmitted email to ${options.to}. Message ID: ${info.messageId}`);
      return true;
    } catch (err: any) {
      console.error(`[SMTP ERROR] Failed to send email to ${options.to}:`, err.message || err);
      return false;
    }
  }

  async sendPasswordReset(data: PasswordResetEmailData): Promise<boolean> {
    const { subject, text, html } = generatePasswordResetEmail({
      resetUrl: data.resetUrl,
      userName: data.userName,
      expiresMinutes: data.expiresAtMinutes || 60,
    });

    return this.send({
      to: data.to,
      subject,
      text,
      html,
    });
  }
}
