import { IEmailAdapter, SendEmailOptions, PasswordResetEmailData } from "./email.interface";
import { LoggerEmailAdapter } from "./logger.adapter";
import { SmtpEmailAdapter } from "./smtp.adapter";
import { ResendEmailProvider } from "./resend.provider";

export class EmailService {
  private static instance: EmailService;
  private adapter: IEmailAdapter;

  private constructor() {
    const provider = (process.env.EMAIL_PROVIDER || "resend").toLowerCase().trim();

    if (provider === "resend" || process.env.RESEND_API_KEY) {
      this.adapter = new ResendEmailProvider();
    } else if (provider === "smtp") {
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

  public setAdapter(adapter: IEmailAdapter): void {
    this.adapter = adapter;
  }

  public getAdapter(): IEmailAdapter {
    return this.adapter;
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
    if ("getSentEmails" in this.adapter && typeof (this.adapter as any).getSentEmails === "function") {
      return (this.adapter as any).getSentEmails();
    }
    return [];
  }

  public getLastCapturedEmail() {
    if ("getLastSentEmail" in this.adapter && typeof (this.adapter as any).getLastSentEmail === "function") {
      return (this.adapter as any).getLastSentEmail();
    }
    return null;
  }

  public clearCapturedEmails() {
    if ("clearSentEmails" in this.adapter && typeof (this.adapter as any).clearSentEmails === "function") {
      (this.adapter as any).clearSentEmails();
    }
  }
}

export const emailService = EmailService.getInstance();
