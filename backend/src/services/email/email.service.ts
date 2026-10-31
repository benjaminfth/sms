import { IEmailAdapter, SendEmailOptions, PasswordResetEmailData } from "./email.interface";
import { LoggerEmailAdapter } from "./logger.adapter";
import { SmtpEmailAdapter } from "./smtp.adapter";

export class EmailService {
  private static instance: EmailService;
  private adapter: IEmailAdapter;

  private constructor() {
    this.adapter = this.resolveAdapter();
  }

  private resolveAdapter(): IEmailAdapter {
    const provider = (process.env.EMAIL_PROVIDER || "logger").toLowerCase().trim();

    if (provider === "smtp" && process.env.NODE_ENV !== "test") {
      return new SmtpEmailAdapter();
    }
    return new LoggerEmailAdapter();
  }

  private getActiveAdapter(): IEmailAdapter {
    const provider = (process.env.EMAIL_PROVIDER || "logger").toLowerCase().trim();
    if (provider === "smtp" && process.env.NODE_ENV !== "test" && this.adapter.name !== "smtp") {
      this.adapter = new SmtpEmailAdapter();
    }
    return this.adapter;
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  public getAdapterName(): string {
    return this.getActiveAdapter().name;
  }

  public async send(options: SendEmailOptions): Promise<boolean> {
    return this.getActiveAdapter().send(options);
  }

  public async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
    return this.getActiveAdapter().sendPasswordReset(data);
  }

  /**
   * Test / development utility to inspect captured emails
   */
  public getCapturedEmails() {
    const active = this.getActiveAdapter();
    if (active instanceof LoggerEmailAdapter) {
      return active.getSentEmails();
    }
    return [];
  }

  public getLastCapturedEmail() {
    const active = this.getActiveAdapter();
    if (active instanceof LoggerEmailAdapter) {
      return active.getLastSentEmail();
    }
    return null;
  }

  public clearCapturedEmails() {
    const active = this.getActiveAdapter();
    if (active instanceof LoggerEmailAdapter) {
      active.clearSentEmails();
    }
  }
}

export const emailService = EmailService.getInstance();
