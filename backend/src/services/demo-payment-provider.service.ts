import {
  IPaymentProvider,
  PaymentGatewayInput,
  PaymentGatewayResult,
} from "./payment-provider.interface";
import { PaymentStatus } from "@sms/shared";
import crypto from "crypto";

export class DemoPaymentProvider implements IPaymentProvider {
  /**
   * Process a simulated transaction.
   * Clearly marked as simulated to avoid confusion with real banking transactions.
   */
  async processPayment(input: PaymentGatewayInput): Promise<PaymentGatewayResult> {
    const randomSuffix = crypto.randomBytes(4).toString("hex").toUpperCase();
    const reference = `DEMO-${input.paymentMethod}-${Date.now().toString().slice(-6)}-${randomSuffix}`;

    if (input.simulateFailure) {
      return {
        success: false,
        status: PaymentStatus.FAILED,
        transactionReference: reference,
        provider: "BRIGHTLOOP_DEMO_GATEWAY",
        isSimulated: true,
        errorMessage: "Simulated payment failure (insufficient test funds or declined by simulated gateway)",
      };
    }

    return {
      success: true,
      status: PaymentStatus.COMPLETED,
      transactionReference: reference,
      provider: "BRIGHTLOOP_DEMO_GATEWAY",
      isSimulated: true,
      metadata: {
        method: input.paymentMethod,
        currency: input.currency,
        timestamp: new Date().toISOString(),
        idempotencyKey: input.idempotencyKey,
      },
    };
  }
}

export const demoPaymentProvider = new DemoPaymentProvider();
