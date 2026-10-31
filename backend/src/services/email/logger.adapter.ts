import { IEmailAdapter, SendEmailOptions, PasswordResetEmailData } from "./email.interface";
import { generatePasswordResetEmail } from "./templates/password-reset.template";

export class LoggerEmailAdapter implements IEmailAdapter {
  readonly name = "logger";
  private sentEmails: Array<SendEmailOptions & { timestamp: Date }> = [];

  async send(options: SendEmailOptions): Promise<boolean> {
    const record = { ...options, timestamp: new Date() };
    this.sentEmails.push(record);

    if (process.env.NODE_ENV !== "test") {
      console.log("==================== [DEV EMAIL LOGGER] ====================");
      console.log(`To:      ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Date:    ${record.timestamp.toISOString()}`);
      if (options.text) {
        console.log("----------------------- Message Body -----------------------");
        console.log(options.text);
      }
      console.log("============================================================");
    }

    return true;
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
