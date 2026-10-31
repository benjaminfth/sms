import { PaymentMethod, PaymentStatus } from "@sms/shared";

export interface PaymentGatewayInput {
  amountMinor: bigint;
  currency: string;
  customerId: string;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  idempotencyKey?: string;
  simulateFailure?: boolean;
}

export interface PaymentGatewayResult {
  success: boolean;
  transactionReference: string;
  provider: string;
  isSimulated: boolean;
  status: PaymentStatus;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface IPaymentProvider {
  processPayment(input: PaymentGatewayInput): Promise<PaymentGatewayResult>;
}
