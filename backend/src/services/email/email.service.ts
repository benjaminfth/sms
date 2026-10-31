import { IEmailAdapter, SendEmailOptions, PasswordResetEmailData } from "./email.interface";
import { LoggerEmailAdapter } from "./logger.adapter";
import { SmtpEmailAdapter } from "./smtp.adapter";

export class EmailService {
  private static instance: EmailService;
  private adapter: IEmailAdapter;

  private constructor() {
    const provider = (process.env.EMAIL_PROVIDER || "logger").toLowerCase().trim();

    if (provider === "smtp" && process.env.NODE_ENV !== "test") {
      this.adapter = new SmtpEmailAdapter();
    } else {
      this.adapter = new LoggerEmailAdapter();
    }
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  public getAdapterName(): string {
    return this.adapter.name;
  }

  public async send(options: SendEmailOptions): Promise<boolean> {
    return this.adapter.send(options);
  }

  public async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
    return this.adapter.sendPasswordReset(data);
  }

  /**
   * Test / development utility to inspect captured emails
   */
  public getCapturedEmails() {
    if (this.adapter instanceof LoggerEmailAdapter) {
      return this.adapter.getSentEmails();
    }
    return [];
  }

  public getLastCapturedEmail() {
    if (this.adapter instanceof LoggerEmailAdapter) {
      return this.adapter.getLastSentEmail();
    }
    return null;
  }

  public clearCapturedEmails() {
    if (this.adapter instanceof LoggerEmailAdapter) {
      this.adapter.clearSentEmails();
    }
  }
}

export const emailService = EmailService.getInstance();
