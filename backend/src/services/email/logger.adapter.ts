import { IEmailAdapter, SendEmailOptions, PasswordResetEmailData } from "./email.interface";

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
    const expiresMinutes = data.expiresAtMinutes || 60;
    const subject = "Reset Your Brightloop Software Password";
    const text = `Hello ${data.userName || "Customer"},\n\n` +
      `We received a request to reset your password for your Brightloop SMS account.\n` +
      `Click the secure link below or paste it into your browser to reset your password:\n\n` +
      `${data.resetUrl}\n\n` +
      `This link will expire in ${expiresMinutes} minutes.\n` +
      `If you did not request this password reset, please ignore this email.\n\n` +
      `Best regards,\nBrightloop Software Security Team`;

    const html = `<div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">` +
      `<h2 style="color: #0f172a;">Password Reset Request</h2>` +
      `<p>Hello ${data.userName || "Customer"},</p>` +
      `<p>We received a request to reset your password for your Brightloop SMS account. Click the button below to set a new password:</p>` +
      `<div style="margin: 24px 0;"><a href="${data.resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Reset Password</a></div>` +
      `<p style="color: #64748b; font-size: 13px;">This link will expire in ${expiresMinutes} minutes. If you did not request this, you can safely ignore this email.</p>` +
      `</div>`;

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
