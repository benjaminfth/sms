import { Role } from "@sms/shared";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: Role;
        email: string;
        customerId?: string;
      };
    }
  }
}

export {};
