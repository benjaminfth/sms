import { Resend } from "resend";
import { IEmailAdapter, SendEmailOptions, PasswordResetEmailData } from "./email.interface";
import { generatePasswordResetEmail } from "./templates/password-reset.template";

export class ResendEmailProvider implements IEmailAdapter {
  readonly name = "resend";
  private resendClient: Resend | null = null;
  private from: string;
  private sentEmails: Array<SendEmailOptions & { timestamp: Date }> = [];

  constructor() {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    this.from = process.env.EMAIL_FROM || "Brightloop SMS <noreply@brightloop.io>";

    if (apiKey && apiKey.startsWith("re_") && apiKey !== "re_your_api_key") {
      this.resendClient = new Resend(apiKey);
    } else {
      // In development or when API key is not configured, client remains null
      // Requests will be handled safely without throwing uncaught exceptions
    }
  }

  async send(options: SendEmailOptions): Promise<boolean> {
    const record = { ...options, timestamp: new Date() };
    this.sentEmails.push(record);

    if (!this.resendClient) {
      console.warn(
        `[RESEND WARNING] RESEND_API_KEY not configured. Simulated transactional email to: ${options.to} | Subject: "${options.subject}"`
      );
      return true;
    }

    try {
      const response = await this.resendClient.emails.send({
        from: this.from,
        to: options.to,
        subject: options.subject,
        text: options.text || "",
        html: options.html,
      });

      if (response.error) {
        console.error(
          `[RESEND ERROR] Failed to send email to ${options.to}: ${response.error.name} - ${response.error.message}`
        );
        return false;
      }

      return true;
    } catch (err: any) {
      console.error(
        `[RESEND NETWORK ERROR] Unexpected error transmitting email to ${options.to}: ${err?.message || "Unknown error"}`
      );
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

  getSentEmails() {
    return [...this.sentEmails];
  }

  getLastSentEmail() {
    return this.sentEmails[this.sentEmails.length - 1] || null;
  }

  clearSentEmails() {
    this.sentEmails = [];
  }
}
